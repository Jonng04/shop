import { and, desc, eq, gte, lt, sql } from "drizzle-orm";
import type { User } from "#auth-utils";

import { db } from "../../database";
import { orderItems, orders, users } from "../../database/schema";
import {
  requireAdminPermission,
  type AdminSessionUser,
} from "../../utils/admin-permissions";

interface AdminUser extends User, AdminSessionUser {}

const startOfDay = (date: Date) => {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
};

const addDays = (date: Date, days: number) => {
  const value = new Date(date);
  value.setDate(value.getDate() + days);
  return value;
};

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event);
  const user = session.user as AdminUser;

  await requireAdminPermission(user, "view_dashboard");

  try {
    const todayStart = startOfDay(new Date());
    const tomorrowStart = addDays(todayStart, 1);
    const yesterdayStart = addDays(todayStart, -1);
    const chartStart = addDays(todayStart, -11);

    const [
      todayRevenueRows,
      yesterdayRevenueRows,
      todayOrdersRows,
      yesterdayOrdersRows,
      todayUsersRows,
      yesterdayUsersRows,
      recentOrdersRows,
      chartRows,
      topProductsRows,
    ] = await Promise.all([
      db
        .select({
          total: sql<number>`coalesce(sum(${orders.totalAmount}), 0)`,
        })
        .from(orders)
        .where(
          and(
            eq(orders.status, "completed"),
            gte(orders.createdAt, todayStart),
            lt(orders.createdAt, tomorrowStart)
          )
        ),
      db
        .select({
          total: sql<number>`coalesce(sum(${orders.totalAmount}), 0)`,
        })
        .from(orders)
        .where(
          and(
            eq(orders.status, "completed"),
            gte(orders.createdAt, yesterdayStart),
            lt(orders.createdAt, todayStart)
          )
        ),
      db
        .select({
          total: sql<number>`count(*)`,
          completed: sql<number>`sum(case when ${orders.status} = 'completed' then 1 else 0 end)`,
        })
        .from(orders)
        .where(and(gte(orders.createdAt, todayStart), lt(orders.createdAt, tomorrowStart))),
      db
        .select({
          total: sql<number>`count(*)`,
        })
        .from(orders)
        .where(and(gte(orders.createdAt, yesterdayStart), lt(orders.createdAt, todayStart))),
      db
        .select({
          total: sql<number>`count(*)`,
        })
        .from(users)
        .where(and(gte(users.createdAt, todayStart), lt(users.createdAt, tomorrowStart))),
      db
        .select({
          total: sql<number>`count(*)`,
        })
        .from(users)
        .where(and(gte(users.createdAt, yesterdayStart), lt(users.createdAt, todayStart))),
      db
        .select({
          orderCode: orders.orderCode,
          username: users.username,
          totalAmount: orders.totalAmount,
          status: orders.status,
          createdAt: orders.createdAt,
        })
        .from(orders)
        .leftJoin(users, eq(orders.userId, users.id))
        .orderBy(desc(orders.id))
        .limit(8),
      db
        .select({
          day: sql<string>`date(${orders.createdAt})`,
          revenue: sql<number>`coalesce(sum(case when ${orders.status} = 'completed' then ${orders.totalAmount} else 0 end), 0)`,
        })
        .from(orders)
        .where(gte(orders.createdAt, chartStart))
        .groupBy(sql`date(${orders.createdAt})`)
        .orderBy(sql`date(${orders.createdAt}) asc`),
      db
        .select({
          productName: orderItems.productName,
          soldCount: sql<number>`coalesce(sum(${orderItems.quantity}), 0)`,
          revenue: sql<number>`coalesce(sum(${orderItems.totalAmount}), 0)`,
        })
        .from(orderItems)
        .leftJoin(orders, eq(orderItems.orderId, orders.id))
        .where(eq(orders.status, "completed"))
        .groupBy(orderItems.productName)
        .orderBy(sql`coalesce(sum(${orderItems.quantity}), 0) desc`)
        .limit(5),
    ]);

    const todayRevenue = Number(todayRevenueRows[0]?.total || 0);
    const yesterdayRevenue = Number(yesterdayRevenueRows[0]?.total || 0);
    const todayOrders = Number(todayOrdersRows[0]?.total || 0);
    const yesterdayOrders = Number(yesterdayOrdersRows[0]?.total || 0);
    const todayCompletedOrders = Number(todayOrdersRows[0]?.completed || 0);
    const todayUsers = Number(todayUsersRows[0]?.total || 0);
    const yesterdayUsers = Number(yesterdayUsersRows[0]?.total || 0);
    const conversionRate =
      todayOrders > 0 ? Number(((todayCompletedOrders / todayOrders) * 100).toFixed(1)) : 0;

    const formatTrend = (current: number, previous: number) => {
      if (previous <= 0) {
        return {
          trendValue: current > 0 ? "+100%" : "0%",
          isUp: current >= previous,
        };
      }

      const percent = ((current - previous) / previous) * 100;
      return {
        trendValue: `${percent >= 0 ? "+" : ""}${percent.toFixed(1)}%`,
        isUp: percent >= 0,
      };
    };

    const chartMap = new Map(
      chartRows.map((item) => [String(item.day), Number(item.revenue || 0)])
    );

    const revenueChart = Array.from({ length: 12 }, (_, index) => {
      const date = addDays(chartStart, index);
      const key = date.toISOString().slice(0, 10);
      return {
        label: `${String(date.getDate()).padStart(2, "0")}/${String(
          date.getMonth() + 1
        ).padStart(2, "0")}`,
        revenue: chartMap.get(key) || 0,
      };
    });

    return {
      stats: {
        revenue: {
          label: "Doanh thu hôm nay",
          value: todayRevenue,
          ...formatTrend(todayRevenue, yesterdayRevenue),
          icon: "solar:wallet-money-bold-duotone",
        },
        orders: {
          label: "Đơn hàng mới",
          value: todayOrders,
          ...formatTrend(todayOrders, yesterdayOrders),
          icon: "solar:cart-large-bold-duotone",
        },
        users: {
          label: "Khách hàng mới",
          value: todayUsers,
          ...formatTrend(todayUsers, yesterdayUsers),
          icon: "solar:users-group-rounded-bold-duotone",
        },
        conversion: {
          label: "Tỷ lệ chuyển đổi",
          value: conversionRate,
          ...formatTrend(conversionRate, 0),
          icon: "solar:chart-square-bold-duotone",
        },
      },
      recentOrders: recentOrdersRows.map((item) => ({
        id: item.orderCode,
        customer: item.username || "Khách hàng",
        amount: Number(item.totalAmount || 0),
        status: item.status || "pending",
        createdAt: item.createdAt,
      })),
      revenueChart,
      topProducts: topProductsRows.map((item) => ({
        name: item.productName || "Sản phẩm",
        soldCount: Number(item.soldCount || 0),
        revenue: Number(item.revenue || 0),
      })),
    };
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      message: error?.message || "Không thể tải dữ liệu dashboard",
    });
  }
});
