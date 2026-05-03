import bcrypt from "bcrypt";
import { eq, or } from "drizzle-orm";
import { getHeader } from "h3";

import { db } from "../../database";
import { settings, users, affiliateLinks } from "../../database/schema";
import { parseRegisterBody } from "../../utils/request-validation";

const MAX_REGISTER_ATTEMPTS = 5;
const REGISTER_WINDOW_MINUTES = 10;

interface RegisterAttemptState {
  attempts: number;
  expiresAt: number;
}

const registerAttempts = new Map<string, RegisterAttemptState>();

async function verifyTurnstile(token: string, ip?: string): Promise<boolean> {
  if (!token) return false;

  const row = await db.query.settings.findFirst({
    where: eq(settings.key, "turnstileSecretKey"),
  });

  const secretKey = row?.value || "";
  if (!secretKey) return false;

  const body = new URLSearchParams({
    secret: secretKey,
    response: token,
    ...(ip ? { remoteip: ip } : {}),
  });

  try {
    const res = await $fetch<{ success: boolean }>(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        body: body.toString(),
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      }
    );

    return res.success === true;
  } catch {
    return false;
  }
}

const isTurnstileEnabled = async () => {
  const row = await db.query.settings.findFirst({
    where: eq(settings.key, "turnstileEnabled"),
  });

  if (!row) return false;

  const raw = String(row.value || "")
    .trim()
    .toLowerCase();
  return ["1", "true", "on", "yes"].includes(raw);
};

const getRegisterAttemptState = (ip: string, now: number) => {
  const state = registerAttempts.get(ip);

  if (!state) return null;

  if (state.expiresAt <= now) {
    registerAttempts.delete(ip);
    return null;
  }

  return state;
};

const incrementRegisterAttemptState = (ip: string) => {
  const now = Date.now();
  const current = getRegisterAttemptState(ip, now);
  const nextState = {
    attempts: (current?.attempts || 0) + 1,
    expiresAt: now + REGISTER_WINDOW_MINUTES * 60 * 1000,
  };

  registerAttempts.set(ip, nextState);
  return nextState;
};

const clearRegisterAttemptState = (ip: string) => {
  registerAttempts.delete(ip);
};

/**
 * Helper: Extract ref code from cookie header
 */
const getRefCodeFromCookie = (cookieHeader: string): string | null => {
  if (!cookieHeader) return null;

  const parts = cookieHeader.split(";");
  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed.startsWith("affiliate_ref=")) {
      const value = trimmed.substring("affiliate_ref=".length);
      try {
        return decodeURIComponent(value);
      } catch {
        return null;
      }
    }
  }
  return null;
};

export default defineEventHandler(async (event) => {
  const { username, email, password, turnstileToken } = parseRegisterBody(
    await readBody(event)
  );

  const clientIp =
    getHeader(event, "x-forwarded-for") ||
    event.node.req.socket.remoteAddress ||
    "unknown";

  const turnstileEnabled = await isTurnstileEnabled();
  const activeAttemptState = getRegisterAttemptState(
    String(clientIp),
    Date.now()
  );

  if (
    !turnstileEnabled &&
    activeAttemptState &&
    activeAttemptState.attempts >= MAX_REGISTER_ATTEMPTS
  ) {
    throw createError({
      statusCode: 429,
      message: `Bạn đã đăng ký quá nhiều lần. Vui lòng thử lại sau ${REGISTER_WINDOW_MINUTES} phút.`,
    });
  }

  if (turnstileEnabled) {
    const isValid = await verifyTurnstile(
      turnstileToken || "",
      String(clientIp)
    );

    if (!isValid) {
      throw createError({
        statusCode: 400,
        message: "Xác minh bảo mật không hợp lệ, vui lòng thử lại",
      });
    }
  }

  try {
    const affiliateEnabledRow = await db.query.settings.findFirst({
      where: eq(settings.key, "affiliateEnabled"),
      columns: { value: true },
    });
    const affiliateAutoCreateRow = await db.query.settings.findFirst({
      where: eq(settings.key, "affiliateAutoCreateLink"),
      columns: { value: true },
    });
    const affiliateRateRow = await db.query.settings.findFirst({
      where: eq(settings.key, "affiliateCommissionRate"),
      columns: { value: true },
    });

    const isAffiliateEnabled =
      String(affiliateEnabledRow?.value || "true")
        .trim()
        .toLowerCase() !== "false";
    const isAffiliateAutoCreate =
      String(affiliateAutoCreateRow?.value || "true")
        .trim()
        .toLowerCase() !== "false";
    const defaultAffiliateCommissionRate = Math.max(
      0,
      Math.min(100, Number(affiliateRateRow?.value || 10) || 10)
    );

    const existingUser = await db.query.users.findFirst({
      where: or(eq(users.username, username), eq(users.email, email)),
    });

    if (existingUser) {
      incrementRegisterAttemptState(String(clientIp));
      throw createError({
        statusCode: 409,
        message: "Tên đăng nhập hoặc Email đã tồn tại",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userAgent = getHeader(event, "user-agent");

    // Get ref code from cookie (nếu có)
    const cookieHeader = getHeader(event, "cookie") || "";
    const refCodeFromCookie = getRefCodeFromCookie(cookieHeader);

    await db.insert(users).values({
      username,
      email,
      password: hashedPassword,
      role: "user",
      status: "active",
      balance: 0,
      lastIp: String(clientIp),
      device: userAgent,
      referredByRefCode:
        isAffiliateEnabled && refCodeFromCookie ? refCodeFromCookie : null,
    });

    clearRegisterAttemptState(String(clientIp));

    const newUser = await db.query.users.findFirst({
      where: eq(users.username, username),
    });

    // 💡 Auto-create affiliate link for new user
    if (newUser && isAffiliateEnabled && isAffiliateAutoCreate) {
      try {
        await db.insert(affiliateLinks).values({
          userId: newUser.id,
          refCode: username, // Use username as ref code
          commissionRate: defaultAffiliateCommissionRate,
          totalClicks: 0,
          totalOrders: 0,
          totalEarned: 0,
          pendingBalance: 0,
          status: "active",
        });
      } catch {
        // Silently fail - affiliate link creation error
      }
    }

    // Track affiliate click nếu có ref code
    if (newUser) {
      const { password: _, ...userWithoutPassword } = newUser;
      await setUserSession(event, {
        user: {
          ...userWithoutPassword,
          permissions: [],
        },
        loggedInAt: new Date().toISOString(),
      });
    }

    return {
      success: true,
      message: "Đăng ký thành công",
    };
  } catch (error: any) {
    if ((error?.statusCode || 500) >= 500) {
      incrementRegisterAttemptState(String(clientIp));
    }

    return createError({
      statusCode: error.statusCode || 500,
      message: error.message || "Internal Server Error",
    });
  }
});
