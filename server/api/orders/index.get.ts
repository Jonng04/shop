import { and, desc, eq, like, sql, type SQL } from "drizzle-orm";
import type { User } from "#auth-utils";
import { db } from "../../database";
import { orderItems, orders } from "../../database/schema";
import { type AdminSessionUser } from "../../utils/admin-permissions";

interface SessionUser extends User, AdminSessionUser {}

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event);
  const user = session.user as SessionUser | undefined;

  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Vui lòng đăng nhập" });
  }

  const userId = user.id as number;
  const query = getQuery(event);
  const search = String(query.search || "").trim();
  const status = String(query.status || "all").trim();
  const page = Math.max(Number(query.page || 1), 1);
  const pageSize = Math.min(Math.max(Number(query.pageSize || 10), 1), 50);
  const offset = (page - 1) * pageSize;

  const conditions: SQL[] = [eq(orders.userId, userId)];

  if (search) {
    conditions.push(like(orders.orderCode, `%${search}%`));
  }
  if (status !== "all") {
    conditions.push(eq(orders.status, status));
  }

  const whereClause = and(...conditions);

  const countResult = await db
    .select({ total: sql<number>`count(*)` })
    .from(orders)
    .where(whereClause);
  const total = Number(countResult[0]?.total ?? 0);

  const rows = await db
    .select({
      id: orders.id,
      orderCode: orders.orderCode,
      status: orders.status,
      fulfillmentStatus: orders.fulfillmentStatus,
      orderType: orders.orderType,
      paymentType: orders.paymentType,
      totalAmount: orders.totalAmount,
      itemCount: sql<number>`count(${orderItems.id})`,
      createdAt: orders.createdAt,
    })
    .from(orders)
    .leftJoin(orderItems, eq(orderItems.orderId, orders.id))
    .where(whereClause)
    .groupBy(orders.id)
    .orderBy(desc(orders.createdAt))
    .limit(pageSize)
    .offset(offset);

  return {
    data: rows,
    pagination: {
      page,
      pageSize,
      total: total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
});
