import { and, eq } from "drizzle-orm";

import { db } from "../../../database";
import { orders } from "../../../database/schema";
import { requireApiV1Auth } from "../../../utils/api-v1-auth";

export default defineEventHandler(async (event) => {
  const authUser = await requireApiV1Auth(event);
  const query = getQuery(event);

  const page = Math.max(Number(query.page || 1), 1);
  const limit = Math.min(Math.max(Number(query.limit || 20), 1), 100);
  const status = String(query.status || "").trim();

  const conditions = [eq(orders.userId, authUser.id)];
  if (status) {
    conditions.push(eq(orders.status, status));
  }

  const rows = await db.query.orders.findMany({
    where: and(...conditions),
    orderBy: (o, { desc: descHelper }) => [descHelper(o.createdAt)],
  });

  const total = rows.length;
  const totalPages = Math.max(Math.ceil(total / limit), 1);
  const offset = (page - 1) * limit;
  const sliced = rows.slice(offset, offset + limit);

  return {
    success: true,
    data: {
      orders: sliced.map((item) => ({
        id: item.id,
        trans_id: item.orderCode,
        order_type: item.orderType,
        status: item.status,
        fulfillment_status: item.fulfillmentStatus,
        payment_status: item.paymentType === "balance" ? "paid" : "pending",
        subtotal_amount: item.subtotalAmount,
        discount_amount: item.discountAmount,
        total_amount: item.totalAmount,
        coupon_code: item.couponCode,
        created_at: item.createdAt,
        updated_at: item.updatedAt,
      })),
      pagination: {
        current_page: page,
        per_page: limit,
        total,
        total_pages: totalPages,
        has_more: page < totalPages,
      },
    },
  };
});
