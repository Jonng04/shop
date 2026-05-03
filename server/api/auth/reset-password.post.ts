import { createHash } from "node:crypto";
import bcrypt from "bcrypt";
import { eq, like } from "drizzle-orm";

import { db } from "../../database";
import { users } from "../../database/schema";

const MIN_PASSWORD_LENGTH = 6;

const hashResetToken = (token: string) =>
  createHash("sha256").update(token).digest("hex");

export default defineEventHandler(async (event) => {
  const body = await readBody(event);

  const token = String(body?.token || "").trim();
  const password = String(body?.password || "");
  const confirmPassword = String(body?.confirmPassword || "");

  if (!token) {
    throw createError({ statusCode: 400, message: "Token không hợp lệ" });
  }

  if (!password || password.length < MIN_PASSWORD_LENGTH) {
    throw createError({
      statusCode: 400,
      message: `Mật khẩu phải có ít nhất ${MIN_PASSWORD_LENGTH} ký tự`,
    });
  }

  if (password !== confirmPassword) {
    throw createError({
      statusCode: 400,
      message: "Mật khẩu xác nhận không khớp",
    });
  }

  const tokenHash = hashResetToken(token);

  // Ưu tiên định dạng token mới: v2:<sha256(token)>:<expiresAtMs>
  let matchedUser = await db.query.users.findFirst({
    where: like(users.resetToken, `v2:${tokenHash}:%`),
    columns: {
      id: true,
      resetToken: true,
      status: true,
    },
  });

  // Fallback tạm thời cho token legacy dạng rawToken:expiresAt
  if (!matchedUser?.id) {
    matchedUser = await db.query.users.findFirst({
      where: like(users.resetToken, `${token}:%`),
      columns: {
        id: true,
        resetToken: true,
        status: true,
      },
    });
  }

  if (!matchedUser?.id || !matchedUser.resetToken) {
    throw createError({
      statusCode: 400,
      message: "Liên kết đặt lại mật khẩu không hợp lệ",
    });
  }

  if (matchedUser.status !== "active") {
    throw createError({
      statusCode: 403,
      message: "Tài khoản hiện không thể đặt lại mật khẩu",
    });
  }

  const tokenParts = String(matchedUser.resetToken).split(":");
  const isV2Token = tokenParts[0] === "v2";
  const storedToken = isV2Token ? tokenParts[1] : tokenParts[0];
  const expiredAtRaw = isV2Token ? tokenParts[2] : tokenParts[1];
  const expectedToken = isV2Token ? tokenHash : token;
  const expiredAt = Number(expiredAtRaw || 0);

  if (
    !storedToken ||
    storedToken !== expectedToken ||
    !Number.isFinite(expiredAt)
  ) {
    throw createError({
      statusCode: 400,
      message: "Liên kết đặt lại mật khẩu không hợp lệ",
    });
  }

  if (Date.now() > expiredAt) {
    await db
      .update(users)
      .set({ resetToken: null })
      .where(eq(users.id, matchedUser.id));

    throw createError({
      statusCode: 400,
      message: "Liên kết đặt lại mật khẩu đã hết hạn",
    });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  await db
    .update(users)
    .set({
      password: hashedPassword,
      resetToken: null,
      loginAttempts: 0,
    })
    .where(eq(users.id, matchedUser.id));

  return {
    success: true,
    message: "Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại.",
  };
});
