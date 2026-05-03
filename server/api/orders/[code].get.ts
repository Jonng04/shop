import { and, eq } from "drizzle-orm";
import type { User } from "#auth-utils";
import { db } from "../../database";
import { orderItems, orders, stocks } from "../../database/schema";
import { type AdminSessionUser } from "../../utils/admin-permissions";

interface SessionUser extends User, AdminSessionUser {}

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event);
  const user = session.user as SessionUser | undefined;

  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Vui lòng đăng nhập" });
  }

  const userId = user.id as number;
  const orderCode = getRouterParam(event, "code");

  if (!orderCode) {
    throw createError({ statusCode: 400, message: "Mã đơn hàng không hợp lệ" });
  }

  const order = await db.query.orders.findFirst({
    where: and(eq(orders.orderCode, orderCode), eq(orders.userId, userId)),
  });

  if (!order) {
    throw createError({ statusCode: 404, message: "Không tìm thấy đơn hàng" });
  }

  const items = await db
    .select({
      id: orderItems.id,
      productId: orderItems.productId,
      planId: orderItems.planId,
      productName: orderItems.productName,
      planName: orderItems.planName,
      quantity: orderItems.quantity,
      unitPrice: orderItems.unitPrice,
      totalAmount: orderItems.totalAmount,
      status: orderItems.status,
      deliveredContent: orderItems.deliveredContent,
      deliveredAt: orderItems.deliveredAt,
    })
    .from(orderItems)
    .where(eq(orderItems.orderId, order.id));

  return { ...order, items };
});
