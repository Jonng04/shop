import { and, desc, eq, sql } from "drizzle-orm";
import type { User } from "#auth-utils";
import { db } from "../../database";
import { orders, payments, users, wishlists } from "../../database/schema";
import { type AdminSessionUser } from "../../utils/admin-permissions";

interface SessionUser extends User, AdminSessionUser {}

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event);
  const user = session.user as SessionUser | undefined;

  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  const userId = Number(user.id);

  const [
    dbUser,
    totalOrdersResult,
    completedOrdersResult,
    wishlistCountResult,
    paidDepositsResult,
    recentOrders,
    recentDeposits,
  ] = await Promise.all([
    db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: {
        id: true,
        username: true,
        email: true,
        balance: true,
        totalBalance: true,
        role: true,
        status: true,
        createdAt: true,
      },
    }),
    db
      .select({ total: sql<number>`count(*)` })
      .from(orders)
      .where(eq(orders.userId, userId)),
    db
      .select({ total: sql<number>`count(*)` })
      .from(orders)
      .where(and(eq(orders.userId, userId), eq(orders.status, "completed"))),
    db
      .select({ total: sql<number>`count(*)` })
      .from(wishlists)
      .where(eq(wishlists.userId, userId)),
    db
      .select({ total: sql<number>`count(*)` })
      .from(payments)
      .where(
        and(
          eq(payments.userId, userId),
          eq(payments.type, "topup"),
          eq(payments.status, "paid")
        )
      ),
    db.query.orders.findMany({
      where: eq(orders.userId, userId),
      columns: {
        id: true,
        orderCode: true,
        status: true,
        fulfillmentStatus: true,
        totalAmount: true,
        createdAt: true,
      },
      orderBy: [desc(orders.createdAt)],
      limit: 5,
    }),
    db.query.payments.findMany({
      where: and(eq(payments.userId, userId), eq(payments.type, "topup")),
      columns: {
        id: true,
        paymentCode: true,
        status: true,
        amount: true,
        receivedAmount: true,
        createdAt: true,
        paidAt: true,
      },
      orderBy: [desc(payments.createdAt)],
      limit: 5,
    }),
  ]);

  if (!dbUser) {
    throw createError({ statusCode: 404, message: "User not found" });
  }

  return {
    profile: {
      id: dbUser.id,
      username: dbUser.username,
      email: dbUser.email,
      balance: Number(dbUser.balance || 0),
      totalBalance: Number(dbUser.totalBalance || 0),
      role: dbUser.role,
      status: dbUser.status,
      createdAt: dbUser.createdAt,
    },
    stats: {
      totalOrders: Number(totalOrdersResult[0]?.total || 0),
      completedOrders: Number(completedOrdersResult[0]?.total || 0),
      wishlistCount: Number(wishlistCountResult[0]?.total || 0),
      paidDeposits: Number(paidDepositsResult[0]?.total || 0),
    },
    recentOrders: recentOrders.map((item) => ({
      ...item,
      totalAmount: Number(item.totalAmount || 0),
    })),
    recentDeposits: recentDeposits.map((item) => ({
      ...item,
      amount: Number(item.amount || 0),
      receivedAmount: Number(item.receivedAmount || 0),
    })),
  };
});
