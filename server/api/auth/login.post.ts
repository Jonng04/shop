import bcrypt from "bcrypt";
import { getHeader, getRequestIP } from "h3";
import { desc, eq, or } from "drizzle-orm";

import { db } from "../../database";
import { isAllowed } from "../../utils/rate-limit";
import { blockIps, users } from "../../database/schema";
import { getAdminPermissionsByRoleName } from "../../utils/admin-permissions";
import {
  createActivityLog,
  getRequestContextMeta,
} from "../../utils/activity-log";
import { parseLoginBody } from "../../utils/request-validation";

const MAX_LOGIN_ATTEMPTS = 5;
const BLOCK_DURATION_MINUTES = 5;
const INVALID_CREDENTIALS_MESSAGE = "Tài khoản hoặc mật khẩu không chính xác";
const DUMMY_PASSWORD_HASH =
  "$2b$10$e0NRM4f5j6pAq0L8dQkchuG2g2Cz6E6QdlqzTeWY5Avzkdxl3pNGS";

interface FailedLoginState {
  attempts: number;
  expiresAt: number;
}

const failedLoginAttempts = new Map<string, FailedLoginState>();

const getFailedLoginKey = (clientIp: string, identifier: string) =>
  `${clientIp.toLowerCase()}::${identifier.trim().toLowerCase()}`;

const getActiveFailedLoginState = (key: string, now: number) => {
  const state = failedLoginAttempts.get(key);

  if (!state) return null;

  if (state.expiresAt <= now) {
    failedLoginAttempts.delete(key);
    return null;
  }

  return state;
};

const clearFailedLoginState = (clientIp: string, identifier: string) => {
  failedLoginAttempts.delete(getFailedLoginKey(clientIp, identifier));
};

const incrementFailedLoginState = (clientIp: string, identifier: string) => {
  const key = getFailedLoginKey(clientIp, identifier);
  const now = Date.now();
  const expiresAt = now + BLOCK_DURATION_MINUTES * 60 * 1000;
  const current = getActiveFailedLoginState(key, now);
  const nextState = {
    attempts: (current?.attempts || 0) + 1,
    expiresAt,
  };

  failedLoginAttempts.set(key, nextState);

  return nextState;
};

const throwInvalidCredentials = () => {
  throw createError({
    statusCode: 401,
    message: INVALID_CREDENTIALS_MESSAGE,
  });
};

export default defineEventHandler(async (event) => {
  const { identifier, password } = parseLoginBody(await readBody(event));
  const clientIp =
    getRequestIP(event, { xForwardedFor: true }) ||
    event.node.req.socket.remoteAddress ||
    "unknown";
  const userAgent = getHeader(event, "user-agent") || null;

  // Rate limit: 5 login attempts per minute per IP
  if (!isAllowed(`login:${clientIp}`, 5, 60000)) {
    throw createError({
      statusCode: 429,
      message: "Qu? nhi?u l?n th? ??ng nh?p. Vui l?ng ch? 1 ph?t r?i th? l?i.",
    });
  }

  try {
    const [latestBlockRecord] = await db
      .select()
      .from(blockIps)
      .where(eq(blockIps.ip, String(clientIp)))
      .orderBy(desc(blockIps.id))
      .limit(1);

    const now = new Date();

    if (latestBlockRecord?.status === "active") {
      const isExpired =
        latestBlockRecord.expiresAt &&
        new Date(latestBlockRecord.expiresAt) <= now;

      if (isExpired) {
        await db
          .update(blockIps)
          .set({
            status: "expired",
            lastSeenAt: now,
          })
          .where(eq(blockIps.id, latestBlockRecord.id));
      } else {
        await db
          .update(blockIps)
          .set({
            hitCount: Number(latestBlockRecord.hitCount || 0) + 1,
            lastSeenAt: now,
          })
          .where(eq(blockIps.id, latestBlockRecord.id));

        throw createError({
          statusCode: 403,
          message:
            "IP của bạn đang tạm thời bị chặn do đăng nhập sai quá nhiều lần. Vui lòng thử lại sau 5 phút.",
        });
      }
    }

    const user = await db.query.users.findFirst({
      where: or(eq(users.username, identifier), eq(users.email, identifier)),
    });

    // Early return if user not found
    if (!user) {
      throwInvalidCredentials();
    }

    const failedStateBeforeCheck = getActiveFailedLoginState(
      getFailedLoginKey(String(clientIp), identifier),
      now.getTime()
    );

    if (
      failedStateBeforeCheck &&
      failedStateBeforeCheck.attempts >= MAX_LOGIN_ATTEMPTS
    ) {
      throw createError({
        statusCode: 403,
        message: `Bạn đã nhập sai quá ${MAX_LOGIN_ATTEMPTS} lần. Vui lòng thử lại sau ${BLOCK_DURATION_MINUTES} phút.`,
      });
    }

    const isPasswordValid = await bcrypt.compare(
      password,
      user?.password || DUMMY_PASSWORD_HASH
    );

    if (!isPasswordValid) {
      const nextFailedState = incrementFailedLoginState(
        String(clientIp),
        identifier
      );
      const nextLoginAttempts = user
        ? Number(user.loginAttempts || 0) + 1
        : nextFailedState.attempts;

      if (user) {
        await db
          .update(users)
          .set({ loginAttempts: nextLoginAttempts })
          .where(eq(users.id, user.id));
      }

      if (nextLoginAttempts >= MAX_LOGIN_ATTEMPTS) {
        const expiresAt = new Date(
          now.getTime() + BLOCK_DURATION_MINUTES * 60 * 1000
        );

        if (latestBlockRecord) {
          await db
            .update(blockIps)
            .set({
              username: user?.username || identifier,
              reason: `Đăng nhập sai ${MAX_LOGIN_ATTEMPTS} lần liên tiếp`,
              hitCount: Number(latestBlockRecord.hitCount || 0) + 1,
              status: "active",
              blockType: "auto",
              blockedAt: now,
              expiresAt,
              lastSeenAt: now,
            })
            .where(eq(blockIps.id, latestBlockRecord.id));
        } else {
          await db.insert(blockIps).values({
            ip: String(clientIp),
            username: user?.username || identifier,
            country: "VN",
            reason: `Đăng nhập sai ${MAX_LOGIN_ATTEMPTS} lần liên tiếp`,
            hitCount: 1,
            status: "active",
            blockType: "auto",
            blockedAt: now,
            expiresAt,
            lastSeenAt: now,
          });
        }

        const context = getRequestContextMeta(event);
        await createActivityLog({
          actorName: "System",
          actorEmail: null,
          actorRole: "system",
          action: "Tự động block IP do đăng nhập sai",
          module: "Bảo mật",
          target: String(clientIp),
          description: `IP ${clientIp} bị chặn ${BLOCK_DURATION_MINUTES} phút sau ${MAX_LOGIN_ATTEMPTS} lần đăng nhập sai`,
          level: "critical",
          ip: context.ip,
          device: context.device || userAgent,
          metadata: {
            ip: String(clientIp),
            username: user?.username || identifier,
            email: user?.email || null,
            loginAttempts: nextLoginAttempts,
            expiresAt: expiresAt.toISOString(),
            identifier,
          },
        });

        throw createError({
          statusCode: 403,
          message: `Bạn đã nhập sai quá ${MAX_LOGIN_ATTEMPTS} lần. IP bị chặn trong ${BLOCK_DURATION_MINUTES} phút.`,
        });
      }

      throwInvalidCredentials();
    }

    await db
      .update(users)
      .set({
        lastIp: String(clientIp),
        device: userAgent,
        lastLoginAt: new Date(),
        loginAttempts: 0,
      })
      .where(eq(users.id, user!.id));
    clearFailedLoginState(String(clientIp), identifier);

    const { password: _, ...userWithoutPassword } = user!;
    const permissions = await getAdminPermissionsByRoleName(user!.role);
    const sessionUser = {
      ...userWithoutPassword,
      permissions,
    };

    await setUserSession(event, {
      user: sessionUser,
      loggedInAt: new Date().toISOString(),
    });

    return {
      success: true,
      message: "Đăng nhập thành công",
      user: sessionUser,
    };
  } catch (error: any) {
    return createError({
      statusCode: error.statusCode || 500,
      message: error.message || "Internal Server Error",
    });
  }
});
