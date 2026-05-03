import { createHash, randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { getRequestIP } from "h3";

import { db } from "../../database";
import { settings, users } from "../../database/schema";
import { isAllowed } from "../../utils/rate-limit";
import { sendResetPasswordEmail } from "../../utils/mail";

const RESET_TOKEN_EXPIRED_MINUTES = 15;
const FORGOT_PASSWORD_EMAIL_LIMIT = 3;
const FORGOT_PASSWORD_EMAIL_WINDOW_MS = 15 * 60 * 1000;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const hashResetToken = (token: string) =>
  createHash("sha256").update(token).digest("hex");

export default defineEventHandler(async (event) => {
  const clientIp =
    getRequestIP(event, { xForwardedFor: true }) ||
    event.node.req.socket.remoteAddress ||
    "unknown";

  // Rate limit nhẹ cho endpoint quên mật khẩu
  if (!isAllowed(`forgot-password:${clientIp}`, 5, 60_000)) {
    throw createError({
      statusCode: 429,
      message: "Bạn đã gửi quá nhiều yêu cầu. Vui lòng thử lại sau 1 phút.",
    });
  }

  const body = await readBody(event);
  const email = String(body?.email || "")
    .trim()
    .toLowerCase();

  if (!email || !EMAIL_REGEX.test(email)) {
    throw createError({ statusCode: 400, message: "Email không hợp lệ" });
  }

  // Giới hạn theo email để giảm spam/bruteforce vào cùng một tài khoản.
  if (
    !isAllowed(
      `forgot-password:email:${email}`,
      FORGOT_PASSWORD_EMAIL_LIMIT,
      FORGOT_PASSWORD_EMAIL_WINDOW_MS
    )
  ) {
    throw createError({
      statusCode: 429,
      message:
        "Bạn đã gửi quá nhiều yêu cầu cho email này. Vui lòng thử lại sau.",
    });
  }

  const siteUrlRow = await db.query.settings.findFirst({
    where: eq(settings.key, "siteUrl"),
    columns: { value: true },
  });
  const runtimeConfig = useRuntimeConfig();
  const siteUrl = String(
    siteUrlRow?.value || runtimeConfig.public.siteUrl || "http://localhost:3000"
  ).replace(/\/$/, "");

  const account = await db.query.users.findFirst({
    where: eq(users.email, email),
    columns: {
      id: true,
      username: true,
      email: true,
      status: true,
    },
  });

  // Không leak thông tin tồn tại tài khoản
  if (!account || account.status !== "active") {
    return {
      success: true,
      message:
        "Nếu email tồn tại trong hệ thống, chúng tôi đã gửi hướng dẫn đặt lại mật khẩu.",
    };
  }

  const token = randomBytes(32).toString("hex");
  const tokenHash = hashResetToken(token);
  const expiresAt = Date.now() + RESET_TOKEN_EXPIRED_MINUTES * 60 * 1000;
  const resetToken = `v2:${tokenHash}:${expiresAt}`;

  await db.update(users).set({ resetToken }).where(eq(users.id, account.id));

  const resetUrl = `${siteUrl}/auth/reset-password?token=${encodeURIComponent(token)}`;

  void sendResetPasswordEmail({
    toEmail: account.email,
    toName: account.username || "Khách hàng",
    resetUrl,
    expiredMinutes: RESET_TOKEN_EXPIRED_MINUTES,
  });

  return {
    success: true,
    message:
      "Nếu email tồn tại trong hệ thống, chúng tôi đã gửi hướng dẫn đặt lại mật khẩu.",
  };
});
