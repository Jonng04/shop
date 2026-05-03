import { and, eq } from "drizzle-orm";
import type { User } from "#auth-utils";

import { db } from "../../database";
import { banks, payments } from "../../database/schema";
import { type AdminSessionUser } from "../../utils/admin-permissions";

interface SessionUser extends User, AdminSessionUser {}

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event);
  const user = session.user as SessionUser | undefined;

  if (!user?.id) {
    throw createError({
      statusCode: 401,
      message: "Vui lòng đăng nhập để xem hóa đơn",
    });
  }

  const userId = Number(user.id);
  const paymentCode = String(getRouterParam(event, "code") || "").trim();
  const bankId = Number(getQuery(event).bankId || 0);

  if (!paymentCode) {
    throw createError({
      statusCode: 400,
      message: "Thiếu mã hóa đơn",
    });
  }

  const payment = await db.query.payments.findFirst({
    where: and(
      eq(payments.paymentCode, paymentCode),
      eq(payments.userId, userId),
      eq(payments.type, "topup")
    ),
    columns: {
      id: true,
      paymentCode: true,
      userId: true,
      status: true,
      amount: true,
      receivedAmount: true,
      referenceCode: true,
      transferContent: true,
      note: true,
      createdAt: true,
      updatedAt: true,
      expiredAt: true,
      paidAt: true,
    },
  });

  if (!payment) {
    throw createError({
      statusCode: 404,
      message: "Không tìm thấy hóa đơn nạp tiền",
    });
  }

  const now = new Date();
  const isExpired =
    payment.status === "pending" &&
    !!payment.expiredAt &&
    new Date(payment.expiredAt).getTime() <= now.getTime();

  if (isExpired) {
    await db
      .update(payments)
      .set({ status: "expired" })
      .where(eq(payments.id, payment.id));
    payment.status = "expired";
  }

  const bank =
    bankId > 0
      ? await db.query.banks.findFirst({
          where: and(eq(banks.id, bankId), eq(banks.status, "active")),
          columns: {
            id: true,
            bankName: true,
            bankCode: true,
            accountNumber: true,
            accountName: true,
          },
        })
      : null;

  return {
    id: payment.id,
    paymentCode: payment.paymentCode,
    status: payment.status,
    amount: Number(payment.amount || 0),
    receivedAmount: Number(payment.receivedAmount || 0),
    referenceCode: payment.referenceCode || null,
    transferContent: payment.transferContent || null,
    note: payment.note || null,
    createdAt: payment.createdAt || null,
    updatedAt: payment.updatedAt || null,
    expiredAt: payment.expiredAt || null,
    paidAt: payment.paidAt || null,
    bank: bank || null,
  };
});
