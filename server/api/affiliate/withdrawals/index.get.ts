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

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event);
  const user = session.user as SessionUser;

  if (!user?.id) {
    throw createError({
      statusCode: 401,
      message: "Vui lòng đăng nhập",
    });
  }

  const affiliateLink = await db.query.affiliateLinks.findFirst({
    where: eq(affiliateLinks.userId, Number(user.id)),
    columns: {
      id: true,
      pendingBalance: true,
      status: true,
    },
  });

  if (!affiliateLink?.id) {
    throw createError({
      statusCode: 404,
      message: "Người dùng chưa tham gia chương trình affiliate",
    });
  }

  const withdrawals = await db.query.affiliateWithdrawals.findMany({
    where: eq(affiliateWithdrawals.userId, Number(user.id)),
    orderBy: (table, { desc: orderDesc }) => [orderDesc(table.id)],
  });

  const lockedAmount = withdrawals
    .filter((item) => ["pending", "approved"].includes(String(item.status)))
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);

  const completedAmount = withdrawals
    .filter((item) => String(item.status) === "completed")
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);

  const rejectedAmount = withdrawals
    .filter((item) => String(item.status) === "rejected")
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);

  const pendingBalance = Number(affiliateLink.pendingBalance || 0);
  const availableAmount = Math.max(0, pendingBalance - lockedAmount);

  const minWithdrawalRow = await db.query.settings.findFirst({
    where: eq(settings.key, "affiliateMinWithdrawalAmount"),
    columns: { value: true },
  });
  const minWithdrawalAmount = Math.max(
    0,
    Number(minWithdrawalRow?.value || 100) || 100
  );

  return {
    withdrawals: withdrawals.map((item) => ({
      id: item.id,
      withdrawalCode: item.withdrawalCode,
      amount: Number(item.amount || 0),
      method: item.method,
      bankName: item.bankName,
      bankAccountNumber: item.bankAccountNumber,
      bankAccountName: item.bankAccountName,
      status: item.status,
      note: item.note,
      adminNote: item.adminNote,
      reviewedAt: item.reviewedAt,
      completedAt: item.completedAt,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    })),
    summary: {
      affiliateStatus: affiliateLink.status || "active",
      pendingBalance,
      lockedAmount,
      availableAmount,
      minWithdrawalAmount,
      completedAmount,
      rejectedAmount,
    },
  };
});
