import { and, count, eq } from "drizzle-orm";
import { db } from "../../database";
import { plans, stocks } from "../../database/schema";

export default defineEventHandler(async (event) => {
  const planId = Number(getQuery(event).planId);

  if (!planId || isNaN(planId)) {
    throw createError({ statusCode: 400, message: "planId không hợp lệ" });
  }

  const plan = await db.query.plans.findFirst({
    where: eq(plans.id, planId),
    columns: { id: true, deliveryType: true, status: true },
  });

  if (!plan || plan.status !== "active") {
    throw createError({
      statusCode: 404,
      message: "Gói sản phẩm không tồn tại",
    });
  }

  // Plan loại manual/link không giới hạn kho → trả null
  if (plan.deliveryType !== "instant") {
    return { deliveryType: plan.deliveryType, stockCount: null };
  }

  const [row] = await db
    .select({ count: count() })
    .from(stocks)
    .where(and(eq(stocks.planId, planId), eq(stocks.status, "available")));

  return {
    deliveryType: plan.deliveryType,
    stockCount: row?.count ?? 0,
  };
});
