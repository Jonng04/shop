import { and, eq, inArray } from "drizzle-orm";
import type { User } from "#auth-utils";

import { db } from "../../database";
import { isAllowed } from "../../utils/rate-limit";
import { banks, payments, settings, users } from "../../database/schema";
import {
  createActivityLog,
  getRequestContextMeta,
} from "../../utils/activity-log";
import { type AdminSessionUser } from "../../utils/admin-permissions";

interface SessionUser extends User, AdminSessionUser {}

interface BonusRule {
  amount: number;
  percent: number;
}

const parseBonusRules = (value: string | null | undefined) => {
  const raw = String(value || "").trim();

  if (!raw) return [] as BonusRule[];

  return raw
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [amountPart, percentPart] = line.split("|");

      return {
        amount: Number(amountPart || 0),
        percent: Number(percentPart || 0),
      };
    })
    .filter((rule) => rule.amount > 0 && rule.percent > 0)
    .sort((a, b) => a.amount - b.amount);
};

const getRandomCharacters = (type: string, length: number) => {
  const normalizedLength = Math.min(Math.max(length || 8, 4), 24);
  let chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

  if (type === "numeric") {
    chars = "0123456789";
  } else if (type === "alpha_upper") {
    chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  }

  let result = "";

  for (let i = 0; i < normalizedLength; i += 1) {
    const index = Math.floor(Math.random() * chars.length);
    result += chars[index];
  }

  return result;
};

const generatePaymentCode = async (type: string, length: number) => {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const candidate = getRandomCharacters(type, length);
    const existing = await db.query.payments.findFirst({
      where: eq(payments.paymentCode, candidate),
      columns: {
        id: true,
      },
    });

    if (!existing) return candidate;
  }

  throw createError({
    statusCode: 500,
    message: "Kh?ng th? t?o m? h?a ??n ng?u nhi?n, vui l?ng th? l?i",
  });
};

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event);
  const user = session.user as SessionUser | undefined;

  if (!user?.id) {
    throw createError({
      statusCode: 401,
      message: "Vui lòng đăng nhập để tạo hóa đơn nạp tiền",
    });
  }

  const userId = Number(user.id);

  // Rate limit: 5 topup requests per minute per user
  if (!isAllowed(`topup:${userId}`, 5, 60000)) {
    throw createError({
      statusCode: 429,
      message:
        "Bạn đang tạo quá nhiều yêu cầu nạp tiền. Vui lòng chờ 1 phút rồi thử lại.",
    });
  }
  const body = await readBody(event);
  const bankId = Number(body?.bankId || 0);
  const amount = Math.floor(Number(body?.amount || 0));

  if (!bankId || amount <= 0) {
    throw createError({
      statusCode: 400,
      message: "Thiếu ngân hàng hoặc số tiền nạp không hợp lệ",
    });
  }

  const dbUser = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: {
      id: true,
      username: true,
      email: true,
      status: true,
    },
  });

  if (!dbUser) {
    throw createError({
      statusCode: 404,
      message: "Tài khoản không tồn tại",
    });
  }

  if (dbUser.status !== "active") {
    throw createError({
      statusCode: 403,
      message: "Tài khoản của bạn hiện không thể tạo hóa đơn nạp tiền",
    });
  }

  const bank = await db.query.banks.findFirst({
    where: and(eq(banks.id, bankId), eq(banks.status, "active")),
    columns: {
      id: true,
      bankName: true,
      bankCode: true,
      accountNumber: true,
      accountName: true,
      status: true,
    },
  });

  if (!bank) {
    throw createError({
      statusCode: 404,
      message: "Ngân hàng nhận tiền không khả dụng",
    });
  }

  const settingRows = await db
    .select({
      key: settings.key,
      value: settings.value,
    })
    .from(settings)
    .where(
      inArray(settings.key, [
        "depositMinAmount",
        "depositMaxAmount",
        "depositInvoiceExpiryMinutes",
        "depositRandomType",
        "depositRandomLength",
        "depositBonusRules",
      ])
    );

  const settingMap = Object.fromEntries(
    settingRows.map((item) => [item.key, item.value])
  ) as Record<string, string | null>;

  const minAmount = Number(settingMap.depositMinAmount || 10000);
  const maxAmount = Number(settingMap.depositMaxAmount || 5000000);

  if (amount < minAmount || amount > maxAmount) {
    throw createError({
      statusCode: 400,
      message: `Số tiền nạp phải từ ${minAmount.toLocaleString("vi-VN")}đ đến ${maxAmount.toLocaleString("vi-VN")}đ`,
    });
  }

  const expiryMinutes = Math.min(
    Math.max(Number(settingMap.depositInvoiceExpiryMinutes || 15), 5),
    1440
  );
  const now = new Date();
  const expiredAt = new Date(now.getTime() + expiryMinutes * 60 * 1000);
  const randomType = String(
    settingMap.depositRandomType || "alphanumeric"
  ).trim();
  const randomLength = Number(settingMap.depositRandomLength || 8);
  const paymentCode = await generatePaymentCode(randomType, randomLength);
  const transferContent = paymentCode;

  const bonusRules = parseBonusRules(settingMap.depositBonusRules);
  const matchedBonusRule =
    [...bonusRules].reverse().find((rule) => amount >= rule.amount) || null;
  const bonusAmount = matchedBonusRule
    ? Math.floor((amount * matchedBonusRule.percent) / 100)
    : 0;

  const [insertedPayment] = await db
    .insert(payments)
    .values({
      paymentCode,
      userId,
      type: "topup",
      status: "pending",
      amount,
      receivedAmount: 0,
      transferContent,
      note: `Nạp ví qua ${bank.bankName}`,
      expiredAt,
    })
    .$returningId();

  if (!insertedPayment?.id) {
    throw createError({
      statusCode: 500,
      message: "Không thể tạo hóa đơn nạp tiền",
    });
  }

  const meta = getRequestContextMeta(event);
  await createActivityLog({
    actorUserId: userId,
    actorName: dbUser.username || "User",
    actorEmail: dbUser.email || null,
    actorRole: "user",
    action: "create_topup_invoice",
    module: "wallet",
    target: paymentCode,
    description: `Tạo hóa đơn nạp ${amount.toLocaleString("vi-VN")}đ qua ${bank.bankName}`,
    level: "info",
    ...meta,
  });

  return {
    success: true,
    paymentId: insertedPayment.id,
    paymentCode,
    amount,
    transferContent,
    expiredAt: expiredAt.toISOString(),
    bank: {
      id: bank.id,
      bankName: bank.bankName,
      bankCode: bank.bankCode,
      accountNumber: bank.accountNumber,
      accountName: bank.accountName,
    },
    bonusAmount,
    creditedAmount: amount + bonusAmount,
    redirectUrl: `/payments?code=${encodeURIComponent(paymentCode)}&bankId=${bank.id}`,
  };
});
