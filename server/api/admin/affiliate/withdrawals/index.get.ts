import { desc, eq } from "drizzle-orm";
import type { User } from "#auth-utils";

import { db } from "../../../../database";
import { affiliateWithdrawals, users } from "../../../../database/schema";
import {
  requireAdminAccess,
  hasAnyAdminPermission,
  type AdminSessionUser,
} from "../../../../utils/admin-permissions";

interface AdminUser extends User, AdminSessionUser {}

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event);
  const user = session.user as AdminUser;

  requireAdminAccess(user);

  const allowed = await hasAnyAdminPermission(user, ["manage_affiliates"]);

  if (!allowed) {
    throw createError({
      statusCode: 403,
      message: "Bạn không có quyền xem danh sách yêu cầu rút tiền",
    });
  }

  try {
    // Query with LEFT JOIN để lấy user info
    const withdrawalRecords = await db
      .select({
        withdrawal: affiliateWithdrawals,
        user: users,
      })
      .from(affiliateWithdrawals)
      .leftJoin(users, eq(affiliateWithdrawals.userId, users.id))
      .orderBy(desc(affiliateWithdrawals.id));

    const withdrawalsList = withdrawalRecords.map((item) => ({
      id: item.withdrawal.id,
      userId: item.withdrawal.userId,
      username: item.user?.username,
      email: item.user?.email,
      withdrawalCode: item.withdrawal.withdrawalCode,
      amount: Number(item.withdrawal.amount),
      method: item.withdrawal.method,
      bankName: item.withdrawal.bankName,
      bankAccountNumber: item.withdrawal.bankAccountNumber,
      bankAccountName: item.withdrawal.bankAccountName,
      status: item.withdrawal.status,
      note: item.withdrawal.note,
      adminNote: item.withdrawal.adminNote,
      reviewedAt: item.withdrawal.reviewedAt,
      completedAt: item.withdrawal.completedAt,
      createdAt: item.withdrawal.createdAt,
    }));

    // Calculate stats
    const totalWithdrawals = withdrawalsList.reduce(
      (sum, w) => sum + w.amount,
      0
    );
    const pendingAmount = withdrawalsList
      .filter((w) => w.status === "pending")
      .reduce((sum, w) => sum + w.amount, 0);
    const approvedAmount = withdrawalsList
      .filter((w) => w.status === "approved")
      .reduce((sum, w) => sum + w.amount, 0);
    const completedAmount = withdrawalsList
      .filter((w) => w.status === "completed")
      .reduce((sum, w) => sum + w.amount, 0);

    return {
      withdrawals: withdrawalsList,
      stats: {
        totalWithdrawals,
        pendingAmount,
        approvedAmount,
        completedAmount,
      },
    };
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      message:
        error?.message || "Có lỗi xảy ra khi lấy danh sách yêu cầu rút tiền",
    });
  }
});
