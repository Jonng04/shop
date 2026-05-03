import { and, eq } from "drizzle-orm";

import { db } from "../../../database";
import { orderItems, orders } from "../../../database/schema";
import { requireApiV1Auth } from "../../../utils/api-v1-auth";

export default defineEventHandler(async (event) => {
  const authUser = await requireApiV1Auth(event);
  const transId = String(getRouterParam(event, "id") || "").trim();

  if (!transId) {
    throw createError({ statusCode: 400, message: "trans_id is required" });
  }

  const order = await db.query.orders.findFirst({
    where: and(eq(orders.orderCode, transId), eq(orders.userId, authUser.id)),
  });

  if (!order) {
    throw createError({ statusCode: 404, message: "Order not found" });
  }

  const items = await db.query.orderItems.findMany({
    where: eq(orderItems.orderId, order.id),
    columns: {
      id: true,
      planId: true,
      planName: true,
      quantity: true,
      unitPrice: true,
      discountAmount: true,
      totalAmount: true,
      status: true,
      deliveredContent: true,
      deliveredAt: true,
    },
  });

  const deliveryItems = items
    .map((item) => String(item.deliveredContent || "").trim())
    .filter(Boolean);

  return {
    success: true,
    data: {
      order: {
        id: order.id,
        trans_id: order.orderCode,
        order_type: order.orderType,
        status: order.status,
        fulfillment_status: order.fulfillmentStatus,
        payment_status: order.paymentType === "balance" ? "paid" : "pending",
        subtotal_amount: order.subtotalAmount,
        discount_amount: order.discountAmount,
        total_amount: order.totalAmount,
        coupon_code: order.couponCode,
        created_at: order.createdAt,
        updated_at: order.updatedAt,
      },
      items: items.map((item) => ({
        id: item.id,
        plan_id: item.planId,
        plan_name: item.planName,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        discount_amount: item.discountAmount,
        total_amount: item.totalAmount,
        status: item.status,
        delivered_content: item.deliveredContent,
        delivered_at: item.deliveredAt,
      })),
      delivery: {
        items: deliveryItems,
        delivered_count: deliveryItems.length,
        expected_count: items.length,
      },
    },
  };
});
