import { and, desc, eq, like, or, sql, type SQL } from "drizzle-orm";
import type { User } from "#auth-utils";

import { db } from "../../../database";
import { orderItems, orders, payments, users } from "../../../database/schema";
import {
  hasAnyAdminPermission,
  requireAdminAccess,
  type AdminSessionUser,
} from "../../../utils/admin-permissions";

interface AdminUser extends User, AdminSessionUser {}

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event);
  const user = session.user as AdminUser;

  requireAdminAccess(user);

  const allowed = await hasAnyAdminPermission(user, [
    "view_orders",
    "manage_orders",
  ]);

  if (!allowed) {
    throw createError({
      statusCode: 403,
      message: "Bạn không có quyền truy cập danh sách đơn hàng",
    });
  }

  const query = getQuery(event);
  const search = String(query.search || "").trim();
  const status = String(query.status || "all").trim();
  const paymentType = String(query.paymentType || "all").trim();
  const page = Math.max(Number(query.page || 1), 1);
  const pageSize = Math.min(Math.max(Number(query.pageSize || 10), 1), 100);
  const offset = (page - 1) * pageSize;

  const conditions: SQL[] = [];

  if (search) {
    const keyword = `%${search}%`;
    conditions.push(
      or(
        like(orders.orderCode, keyword),
        like(users.username, keyword),
        like(users.email, keyword)
      )!
    );
  }

  if (status !== "all") {
    conditions.push(eq(orders.status, status));
  }

  if (paymentType !== "all") {
    conditions.push(eq(orders.paymentType, paymentType));
  }

  const whereClause = conditions.length ? and(...conditions) : undefined;

  try {
    const [totalRows, statsRows, rows] = await Promise.all([
      db
        .select({
          count: sql<number>`count(distinct ${orders.id})`,
        })
        .from(orders)
        .leftJoin(users, eq(orders.userId, users.id))
        .where(whereClause),
      db
        .select({
          pendingCount: sql<number>`sum(case when ${orders.status} = 'pending' then 1 else 0 end)`,
          completedCount: sql<number>`sum(case when ${orders.status} = 'completed' then 1 else 0 end)`,
          monthlyRevenue: sql<number>`sum(case when ${orders.status} = 'completed' and month(${orders.createdAt}) = month(now()) and year(${orders.createdAt}) = year(now()) then ${orders.totalAmount} else 0 end)`,
          cancelledCount: sql<number>`sum(case when ${orders.status} = 'cancelled' then 1 else 0 end)`,
        })
        .from(orders)
        .leftJoin(users, eq(orders.userId, users.id))
        .where(whereClause),
      db
        .select({
          id: orders.id,
          orderCode: orders.orderCode,
          userId: orders.userId,
          username: users.username,
          email: users.email,
          status: orders.status,
          fulfillmentStatus: orders.fulfillmentStatus,
          paymentType: orders.paymentType,
          paymentStatus: payments.status,
          paymentAmount: payments.amount,
          orderType: orders.orderType,
          totalAmount: orders.totalAmount,
          createdAt: orders.createdAt,
          updatedAt: orders.updatedAt,
          itemCount: sql<number>`count(${orderItems.id})`,
        })
        .from(orders)
        .leftJoin(users, eq(orders.userId, users.id))
        .leftJoin(payments, eq(orders.paymentId, payments.id))
        .leftJoin(orderItems, eq(orderItems.orderId, orders.id))
        .where(whereClause)
        .groupBy(
          orders.id,
          orders.orderCode,
          orders.userId,
          users.username,
          users.email,
          orders.status,
          orders.fulfillmentStatus,
          orders.paymentType,
          payments.status,
          payments.amount,
          orders.orderType,
          orders.totalAmount,
          orders.createdAt,
          orders.updatedAt
        )
        .orderBy(desc(orders.id))
        .limit(pageSize)
        .offset(offset),
    ]);

    return {
      items: rows.map((row) => ({
        ...row,
        paymentAmount: Number(row.paymentAmount || 0),
        totalAmount: Number(row.totalAmount || 0),
        itemCount: Number(row.itemCount || 0),
      })),
      stats: {
        pendingCount: Number(statsRows[0]?.pendingCount || 0),
        completedCount: Number(statsRows[0]?.completedCount || 0),
        monthlyRevenue: Number(statsRows[0]?.monthlyRevenue || 0),
        cancelledCount: Number(statsRows[0]?.cancelledCount || 0),
      },
      pagination: {
        total: Number(totalRows[0]?.count || 0),
        page,
        pageSize,
      },
    };
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      message: error?.message || "Không thể lấy danh sách đơn hàng",
    });
  }
});
