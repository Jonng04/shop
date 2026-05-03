import type { User } from "#auth-utils";
import { eq } from "drizzle-orm";

import { db } from "../../../database";
import {
  affiliateLinks,
  settings,
  affiliateWithdrawals,
} from "../../../database/schema";

interface SessionUser extends User {
  id?: number;
}

const normalizeText = (value: unknown) => String(value || "").trim();

const generateWithdrawalCode = () => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let randomPart = "";

  for (let i = 0; i < 10; i += 1) {
    const index = Math.floor(Math.random() * chars.length);
    randomPart += chars[index];
  }

  return `AFF-${randomPart}`;
};

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event);
  const user = session.user as SessionUser;

  if (!user?.id) {
    throw createError({
      statusCode: 401,
      message: "Vui lòng đăng nhập",
    });
  }

  const body = await readBody(event);
  const amount = Math.floor(Number(body?.amount || 0));
  const bankName = normalizeText(body?.bankName);
  const bankAccountNumber = normalizeText(body?.bankAccountNumber);
  const bankAccountName = normalizeText(body?.bankAccountName);
  const note = normalizeText(body?.note) || null;

  const affiliateEnabledRow = await db.query.settings.findFirst({
    where: eq(settings.key, "affiliateEnabled"),
    columns: { value: true },
  });
  const minWithdrawalRow = await db.query.settings.findFirst({
    where: eq(settings.key, "affiliateMinWithdrawalAmount"),
    columns: { value: true },
  });

  const isAffiliateEnabled =
    String(affiliateEnabledRow?.value || "true")
      .trim()
      .toLowerCase() !== "false";
  const minWithdrawalAmount = Math.max(
    0,
    Number(minWithdrawalRow?.value || 100) || 100
  );

  if (!isAffiliateEnabled) {
    throw createError({
      statusCode: 403,
      message: "Chương trình affiliate hiện đang tạm tắt",
    });
  }

  if (amount <= 0) {
    throw createError({
      statusCode: 400,
      message: "Số tiền rút không hợp lệ",
    });
  }

  if (amount < minWithdrawalAmount) {
    throw createError({
      statusCode: 400,
      message: `Số tiền rút tối thiểu là ${minWithdrawalAmount.toLocaleString("vi-VN")}đ`,
    });
  }

  if (!bankName || !bankAccountNumber || !bankAccountName) {
    throw createError({
      statusCode: 400,
      message: "Vui lòng nhập đầy đủ thông tin ngân hàng",
    });
  }

  const affiliateLink = await db.query.affiliateLinks.findFirst({
    where: eq(affiliateLinks.userId, Number(user.id)),
    columns: {
      id: true,
      status: true,
      pendingBalance: true,
    },
  });

  if (!affiliateLink?.id) {
    throw createError({
      statusCode: 404,
      message: "Người dùng chưa tham gia chương trình affiliate",
    });
  }

  if (String(affiliateLink.status || "active") !== "active") {
    throw createError({
      statusCode: 403,
      message:
        "Tài khoản affiliate của bạn hiện không thể tạo yêu cầu rút tiền",
    });
  }

  const existingWithdrawals = await db.query.affiliateWithdrawals.findMany({
    where: eq(affiliateWithdrawals.userId, Number(user.id)),
    columns: {
      amount: true,
      status: true,
    },
    orderBy: (table, { desc }) => [desc(table.id)],
  });

  const lockedAmount = existingWithdrawals
    .filter((item) => ["pending", "approved"].includes(String(item.status)))
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);

  const pendingBalance = Number(affiliateLink.pendingBalance || 0);
  const availableAmount = Math.max(0, pendingBalance - lockedAmount);

  if (availableAmount <= 0) {
    throw createError({
      statusCode: 400,
      message: "Bạn không còn số dư affiliate khả dụng để rút",
    });
  }

  if (amount > availableAmount) {
    throw createError({
      statusCode: 400,
      message: `Số tiền rút vượt quá mức khả dụng ${availableAmount.toLocaleString("vi-VN")}đ`,
    });
  }

  let withdrawalCode = generateWithdrawalCode();

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const existingCode = await db.query.affiliateWithdrawals.findFirst({
      where: eq(affiliateWithdrawals.withdrawalCode, withdrawalCode),
      columns: { id: true },
    });

    if (!existingCode?.id) {
      break;
    }

    withdrawalCode = generateWithdrawalCode();
  }

  const existingCode = await db.query.affiliateWithdrawals.findFirst({
    where: eq(affiliateWithdrawals.withdrawalCode, withdrawalCode),
    columns: { id: true },
  });

  if (existingCode?.id) {
    throw createError({
      statusCode: 500,
      message: "Không thể tạo mã yêu cầu rút tiền, vui lòng thử lại",
    });
  }

  const [created] = await db
    .insert(affiliateWithdrawals)
    .values({
      userId: Number(user.id),
      withdrawalCode,
      amount,
      method: "bank",
      bankName,
      bankAccountNumber,
      bankAccountName,
      status: "pending",
      note,
    })
    .$returningId();

  if (!created?.id) {
    throw createError({
      statusCode: 500,
      message: "Không thể tạo yêu cầu rút tiền",
    });
  }

  const withdrawal = await db.query.affiliateWithdrawals.findFirst({
    where: eq(affiliateWithdrawals.id, created.id),
  });

  return {
    success: true,
    message: "Đã gửi yêu cầu rút tiền thành công",
    data: {
      withdrawal,
      availableAmountAfter: Math.max(0, availableAmount - amount),
    },
  };
});
