import { desc, eq, sql } from "drizzle-orm";
import type { User } from "#auth-utils";

import { db } from "../../../database";
import {
  orders,
  payments,
  transactions,
  users,
} from "../../../database/schema";
import {
  requireAdminPermission,
  type AdminSessionUser,
} from "../../../utils/admin-permissions";

interface AdminUser extends User, AdminSessionUser {}

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event);
  const user = session.user as AdminUser;

  await requireAdminPermission(user, "view_transactions");

  try {
    const rows = await db
      .select({
        id: transactions.id,
        userId: transactions.userId,
        orderId: transactions.orderId,
        balanceBefore: transactions.balanceBefore,
        amount: transactions.amount,
        balanceAfter: transactions.balanceAfter,
        type: transactions.type,
        status: sql<string | null>`coalesce(${payments.status}, ${orders.status})`,
        description: transactions.description,
        createdAt: transactions.createdAt,
        username: users.username,
        email: users.email,
        orderTotalAmount: orders.totalAmount,
        orderStatus: orders.status,
      })
      .from(transactions)
      .leftJoin(users, eq(transactions.userId, users.id))
      .leftJoin(payments, eq(transactions.paymentId, payments.id))
      .leftJoin(orders, eq(transactions.orderId, orders.id))
      .orderBy(desc(transactions.id));

    const list = rows.map((row) => ({
      ...row,
      balanceBefore: Number(row.balanceBefore || 0),
      amount: Number(row.amount || 0),
      balanceAfter: Number(row.balanceAfter || 0),
      orderTotalAmount: Number(row.orderTotalAmount || 0),
    }));

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const stats = {
      total: list.length,
      depositAmount: list
        .filter((item) => item.type === "deposit")
        .reduce((sum, item) => sum + Math.abs(item.amount), 0),
      purchaseAmount: list
        .filter((item) => item.type === "purchase")
        .reduce((sum, item) => sum + Math.abs(item.amount), 0),
      todayCount: list.filter((item) => {
        if (!item.createdAt) return false;
        return new Date(item.createdAt) >= today;
      }).length,
    };

    return {
      transactions: list,
      stats,
    };
  } catch {
    throw createError({
      statusCode: 500,
      message: "Có lỗi xảy ra khi lấy danh sách giao dịch",
    });
  }
});
