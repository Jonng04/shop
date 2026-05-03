import { and, desc, eq, gte, like, lte, or, type SQL } from "drizzle-orm";
import type { User } from "#auth-utils";

import { db } from "../../../database";
import { payments, users } from "../../../database/schema";
import {
  hasAnyAdminPermission,
  requireAdminAccess,
  type AdminSessionUser,
} from "../../../utils/admin-permissions";

interface AdminUser extends User, AdminSessionUser {}

const getEffectiveTopupAmount = (item: {
  receivedAmount: number | null;
  amount: number | null;
}) => {
  const received = Number(item.receivedAmount || 0);
  if (received > 0) return received;
  return Number(item.amount || 0);
};

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event);
  const user = session.user as AdminUser;

  requireAdminAccess(user);

  const allowed = await hasAnyAdminPermission(user, [
    "view_deposits",
    "manage_deposits",
  ]);

  if (!allowed) {
    throw createError({
      statusCode: 403,
      message: "Bạn không có quyền truy cập danh sách nạp tiền",
    });
  }

  const query = getQuery(event);
  const username = String(query.username || "").trim();
  const paymentCode = String(query.paymentCode || "").trim();
  const transferContent = String(query.transferContent || "").trim();
  const status = String(query.status || "all").trim();
  const dateRange = String(query.dateRange || "all").trim();

  try {
    const conditions: SQL[] = [eq(payments.type, "topup")];

    if (username) {
      const keyword = `%${username}%`;
      conditions.push(or(like(users.username, keyword), like(users.email, keyword))!);
    }

    if (paymentCode) {
      conditions.push(like(payments.paymentCode, `%${paymentCode}%`));
    }

    if (transferContent) {
      conditions.push(like(payments.transferContent, `%${transferContent}%`));
    }

    if (status !== "all") {
      conditions.push(eq(payments.status, status));
    }

    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    if (dateRange === "today") {
      conditions.push(gte(payments.createdAt, startOfToday));
    }

    if (dateRange === "7d") {
      const sevenDaysAgo = new Date(now);
      sevenDaysAgo.setDate(now.getDate() - 7);
      conditions.push(gte(payments.createdAt, sevenDaysAgo));
      conditions.push(lte(payments.createdAt, now));
    }

    if (dateRange === "month") {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      conditions.push(gte(payments.createdAt, startOfMonth));
      conditions.push(lte(payments.createdAt, now));
    }

    const whereClause = and(...conditions);

    const rows = await db
      .select({
        id: payments.id,
        paymentCode: payments.paymentCode,
        username: users.username,
        userId: payments.userId,
        email: users.email,
        status: payments.status,
        amount: payments.amount,
        receivedAmount: payments.receivedAmount,
        referenceCode: payments.referenceCode,
        transferContent: payments.transferContent,
        note: payments.note,
        createdAt: payments.createdAt,
        updatedAt: payments.updatedAt,
        paidAt: payments.paidAt,
      })
      .from(payments)
      .leftJoin(users, eq(payments.userId, users.id))
      .where(whereClause)
      .orderBy(desc(payments.id));

    const items = rows.map((row) => ({
      ...row,
      amount: Number(row.amount || 0),
      receivedAmount: Number(row.receivedAmount || 0),
    }));

    const paidRows = await db
      .select({
        amount: payments.amount,
        receivedAmount: payments.receivedAmount,
        createdAt: payments.createdAt,
        paidAt: payments.paidAt,
      })
      .from(payments)
      .where(and(eq(payments.type, "topup"), eq(payments.status, "paid")))
      .orderBy(desc(payments.id));

    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 7);
    const startOfMonth = new Date(currentYear, currentMonth, 1);

    const stats = {
      totalAmount: 0,
      monthlyAmount: 0,
      weeklyAmount: 0,
      todayAmount: 0,
    };

    const chartMap = new Map<string, number>();

    for (const row of paidRows) {
      const effectiveAmount = getEffectiveTopupAmount(row);
      const effectiveDate = row.paidAt ? new Date(row.paidAt) : row.createdAt ? new Date(row.createdAt) : null;

      if (!effectiveDate || Number.isNaN(effectiveDate.getTime())) continue;

      stats.totalAmount += effectiveAmount;

      if (
        effectiveDate.getMonth() === currentMonth &&
        effectiveDate.getFullYear() === currentYear
      ) {
        stats.monthlyAmount += effectiveAmount;

        const key = `${effectiveDate.getFullYear()}-${String(
          effectiveDate.getMonth() + 1
        ).padStart(2, "0")}-${String(effectiveDate.getDate()).padStart(2, "0")}`;
        chartMap.set(key, (chartMap.get(key) || 0) + effectiveAmount);
      }

      if (effectiveDate >= sevenDaysAgo && effectiveDate <= now) {
        stats.weeklyAmount += effectiveAmount;
      }

      if (effectiveDate >= startOfToday && effectiveDate <= now) {
        stats.todayAmount += effectiveAmount;
      }
    }

    const chart = [];
    const chartCursor = new Date(startOfMonth);

    while (chartCursor <= now) {
      const key = `${chartCursor.getFullYear()}-${String(
        chartCursor.getMonth() + 1
      ).padStart(2, "0")}-${String(chartCursor.getDate()).padStart(2, "0")}`;

      chart.push({
        day: `${String(chartCursor.getDate()).padStart(2, "0")}/${String(
          chartCursor.getMonth() + 1
        ).padStart(2, "0")}`,
        amount: chartMap.get(key) || 0,
      });

      chartCursor.setDate(chartCursor.getDate() + 1);
    }

    return {
      items,
      stats,
      chart,
    };
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      message: error?.message || "Không thể lấy danh sách hóa đơn nạp tiền",
    });
  }
});
