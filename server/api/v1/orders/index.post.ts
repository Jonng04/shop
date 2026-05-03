import { randomBytes } from "node:crypto";
import { and, eq, gte, inArray, lte, sql } from "drizzle-orm";

import { db } from "../../../database";
import {
  couponUsage,
  coupons,
  flashSaleItems,
  flashSales,
  orderItems,
  orders,
  plans,
  stocks,
  transactions,
  users,
} from "../../../database/schema";
import { requireApiV1Auth } from "../../../utils/api-v1-auth";
import { validateCouponForCart } from "../../../utils/coupon";
import { processAffiliateCommissionForOrder } from "../../../utils/affiliate-commission";

interface CreateOrderItemInput {
  plan_id: number;
  quantity?: number;
  fields?: Record<string, unknown>;
}

const ORDER_CODE_RETRY_LIMIT = 5;
const ORDER_CODE_CHARSET = "abcdefghijklmnopqrstuvwxyz0123456789";

const generateOrderCode = () => {
  const bytes = randomBytes(8);
  let suffix = "";

  for (let i = 0; i < 8; i += 1) {
    suffix += ORDER_CODE_CHARSET[bytes[i]! % ORDER_CODE_CHARSET.length];
  }

  return `ord${suffix}`;
};

const isDuplicateEntryError = (error: unknown) => {
  const payload = error as {
    code?: string;
    errno?: number;
    cause?: { code?: string; errno?: number };
  };

  const code = String(payload?.code || payload?.cause?.code || "");
  const errno = Number(payload?.errno || payload?.cause?.errno || 0);

  return code === "ER_DUP_ENTRY" || errno === 1062;
};

export default defineEventHandler(async (event) => {
  const authUser = await requireApiV1Auth(event);
  const body = await readBody(event);
  const items = (
    Array.isArray(body?.items) ? body.items : []
  ) as CreateOrderItemInput[];
  const couponCode = String(body?.coupon_code || "")
    .trim()
    .toUpperCase();

  if (!items.length) {
    throw createError({ statusCode: 400, message: "items is required" });
  }

  const normalized = items.map((item) => ({
    planId: Number(item.plan_id || 0),
    quantity: Math.max(Number(item.quantity || 1), 1),
    fields: item.fields || {},
  }));

  for (const item of normalized) {
    if (!item.planId) {
      throw createError({ statusCode: 400, message: "plan_id is required" });
    }
  }

  const dbUser = await db.query.users.findFirst({
    where: eq(users.id, authUser.id),
    columns: {
      id: true,
      username: true,
      email: true,
      balance: true,
      status: true,
    },
  });

  if (!dbUser) {
    throw createError({ statusCode: 404, message: "Account not found" });
  }

  if (String(dbUser.status || "active") !== "active") {
    throw createError({ statusCode: 403, message: "Account is not active" });
  }

  const uniquePlanIds = [
    ...new Set(normalized.map((item) => Number(item.planId))),
  ];

  const planRows = uniquePlanIds.length
    ? await db
        .select({
          id: plans.id,
          productId: plans.productId,
          name: plans.name,
          price: plans.price,
          deliveryType: plans.deliveryType,
          status: plans.status,
        })
        .from(plans)
        .where(inArray(plans.id, uniquePlanIds))
    : [];

  const planMap = new Map(planRows.map((plan) => [Number(plan.id), plan]));

  const now = new Date();
  const flashRows = uniquePlanIds.length
    ? await db
        .select({
          planId: flashSaleItems.planId,
          discountType: flashSaleItems.discountType,
          discountValue: flashSaleItems.discountValue,
          maxDiscount: flashSaleItems.maxDiscount,
        })
        .from(flashSaleItems)
        .innerJoin(flashSales, eq(flashSaleItems.flashSaleId, flashSales.id))
        .where(
          and(
            inArray(flashSaleItems.planId, uniquePlanIds),
            eq(flashSales.status, "running"),
            lte(flashSales.startAt, now),
            gte(flashSales.endAt, now)
          )
        )
    : [];

  const flashMap = new Map<
    number,
    {
      discountType: string | null;
      discountValue: number | null;
      maxDiscount: number | null;
    }
  >();

  for (const row of flashRows) {
    const planId = Number(row.planId || 0);
    if (planId <= 0 || flashMap.has(planId)) {
      continue;
    }

    flashMap.set(planId, {
      discountType: row.discountType,
      discountValue:
        row.discountValue === null ? null : Number(row.discountValue),
      maxDiscount: row.maxDiscount === null ? null : Number(row.maxDiscount),
    });
  }

  const planSnapshots = await Promise.all(
    normalized.map(async (item) => {
      const plan = planMap.get(Number(item.planId));

      if (!plan || String(plan.status) !== "active") {
        throw createError({
          statusCode: 404,
          message: `Plan ${item.planId} not found`,
        });
      }

      const flashRow = flashMap.get(Number(plan.id)) || null;

      const basePrice = Number(plan.price || 0);
      let effectivePrice = basePrice;

      if (flashRow && basePrice > 0) {
        const discountType = String(flashRow.discountType ?? "percent");
        const discountValue = Number(flashRow.discountValue ?? 0);
        const maxDiscount =
          flashRow.maxDiscount === null ? null : Number(flashRow.maxDiscount);

        if (discountType === "percent") {
          const cut = Math.round((basePrice * discountValue) / 100);
          effectivePrice = Math.max(
            0,
            basePrice -
              (maxDiscount === null ? cut : Math.min(cut, maxDiscount))
          );
        } else if (discountType === "fixed") {
          effectivePrice = Math.max(
            0,
            basePrice -
              (maxDiscount === null
                ? discountValue
                : Math.min(discountValue, maxDiscount))
          );
        }
      }

      return {
        ...item,
        plan,
        effectivePrice,
      };
    })
  );

  const subtotalAmount = planSnapshots.reduce(
    (sum, item) =>
      sum + Number(item.effectivePrice || 0) * Number(item.quantity || 1),
    0
  );

  const couponResult = couponCode
    ? await validateCouponForCart({
        userId: authUser.id,
        couponCode,
        items: planSnapshots.map((item) => ({
          productId: Number(item.plan.productId || 0),
          quantity: Number(item.quantity || 0),
          price: Number(item.effectivePrice || 0),
        })),
      })
    : null;

  const discountAmount = Number(couponResult?.discountAmount || 0);
  const totalAmount = Math.max(0, subtotalAmount - discountAmount);

  const hasManual = planSnapshots.some(
    (item) => (item.plan.deliveryType || "manual") !== "instant"
  );
  const orderType = hasManual ? "manual_order" : "instant";

  const txResult = await db.transaction(async (tx) => {
    const [lockRows] = await tx.execute(
      sql`SELECT id, balance, status FROM users WHERE id = ${authUser.id} FOR UPDATE`
    );
    const lockedUser = (lockRows as unknown as any[])[0] as
      | { id: number; balance: number; status: string }
      | undefined;

    if (!lockedUser) {
      throw createError({ statusCode: 404, message: "Account not found" });
    }

    if (String(lockedUser.status || "active") !== "active") {
      throw createError({ statusCode: 403, message: "Account is not active" });
    }

    const balanceBefore = Number(lockedUser.balance || 0);
    if (balanceBefore < totalAmount) {
      throw createError({ statusCode: 400, message: "Insufficient balance" });
    }

    let newOrder: { id: number } | undefined;
    let transId = "";

    for (let attempt = 0; attempt < ORDER_CODE_RETRY_LIMIT; attempt += 1) {
      const candidateCode = generateOrderCode();

      try {
        const [createdOrder] = await tx
          .insert(orders)
          .values({
            orderCode: candidateCode,
            userId: authUser.id,
            orderType,
            paymentType: "balance",
            couponCode: couponResult?.code ?? null,
            fulfillmentStatus: "pending",
            subtotalAmount,
            discountAmount,
            totalAmount,
            status: "processing",
            customerNote: body?.note ? String(body.note) : null,
          })
          .$returningId();

        if (createdOrder?.id) {
          newOrder = createdOrder;
          transId = candidateCode;
          break;
        }
      } catch (error: any) {
        if (isDuplicateEntryError(error)) {
          continue;
        }

        throw error;
      }
    }

    if (!newOrder?.id || !transId) {
      throw createError({ statusCode: 500, message: "Cannot create order" });
    }

    const [deductResult] = await tx.execute(
      sql`UPDATE users SET balance = balance - ${totalAmount} WHERE id = ${authUser.id} AND balance >= ${totalAmount}`
    );

    if ((deductResult as any).affectedRows === 0) {
      throw createError({ statusCode: 400, message: "Insufficient balance" });
    }

    const deliveryItems: string[] = [];

    for (const item of planSnapshots) {
      const itemSubtotal =
        Number(item.effectivePrice || 0) * Number(item.quantity || 0);
      const lineDiscountAmount =
        subtotalAmount > 0
          ? Math.floor((discountAmount * itemSubtotal) / subtotalAmount)
          : 0;
      const baseUnitDiscount =
        item.quantity > 0 ? Math.floor(lineDiscountAmount / item.quantity) : 0;
      const discountRemainder =
        item.quantity > 0 ? lineDiscountAmount % item.quantity : 0;

      for (let i = 0; i < item.quantity; i++) {
        let stockId: number | null = null;
        let deliveredContent: string | null = null;
        let status = "pending";
        let deliveredAt: Date | null = null;

        const currentUnitDiscount = Math.min(
          Number(item.effectivePrice || 0),
          baseUnitDiscount + (i < discountRemainder ? 1 : 0)
        );

        const isInstant = (item.plan.deliveryType || "manual") === "instant";
        if (isInstant) {
          const [stockRows] = await tx.execute(
            sql`SELECT id, content FROM stocks WHERE plan_id = ${item.plan.id} AND status = 'available' ORDER BY id ASC LIMIT 1 FOR UPDATE`
          );
          const stockRow = (stockRows as unknown as any[])[0] as
            | { id: number; content: string }
            | undefined;

          if (!stockRow) {
            throw createError({
              statusCode: 409,
              message: `Plan ${item.plan.id} out of stock`,
            });
          }

          stockId = Number(stockRow.id);
          deliveredContent = String(stockRow.content || "");
          status = "delivered";
          deliveredAt = new Date();
          deliveryItems.push(deliveredContent);

          await tx
            .update(stocks)
            .set({ status: "sold", orderId: newOrder.id })
            .where(eq(stocks.id, stockId));
        }

        await tx.insert(orderItems).values({
          orderId: newOrder.id,
          productId: item.plan.productId,
          planId: item.plan.id,
          productName: "",
          planName: item.plan.name,
          quantity: 1,
          unitPrice: Number(item.effectivePrice || 0),
          subtotalAmount: Number(item.effectivePrice || 0),
          couponCode: couponResult?.code ?? null,
          discountAmount: currentUnitDiscount,
          totalAmount: Math.max(
            0,
            Number(item.effectivePrice || 0) - currentUnitDiscount
          ),
          stockId,
          deliveredContent,
          status,
          deliveredAt,
        });
      }
    }

    if (couponResult) {
      await tx.insert(couponUsage).values({
        couponId: couponResult.couponId,
        userId: authUser.id,
        orderId: newOrder.id,
        discountType: couponResult.discountType,
        discountValue: couponResult.discountValue,
        discountAmount,
        orderValueBefore: subtotalAmount,
        orderValueAfter: totalAmount,
        status: "applied",
      });

      await tx
        .update(coupons)
        .set({
          usedCount: sql`${coupons.usedCount} + 1`,
        })
        .where(eq(coupons.id, couponResult.couponId));
    }

    const allDelivered = planSnapshots.every(
      (item) => (item.plan.deliveryType || "manual") === "instant"
    );

    await tx
      .update(orders)
      .set({
        fulfillmentStatus: allDelivered ? "delivered" : "pending",
        status: allDelivered ? "completed" : "processing",
        deliveredAt: allDelivered ? new Date() : null,
        completedAt: allDelivered ? new Date() : null,
      })
      .where(eq(orders.id, newOrder.id));

    if (allDelivered) {
      try {
        await processAffiliateCommissionForOrder(tx, newOrder.id);
      } catch {
        // Không block flow mua hàng nếu affiliate xử lý lỗi
      }
    }

    const balanceAfter = balanceBefore - totalAmount;
    await tx.insert(transactions).values({
      userId: authUser.id,
      orderId: newOrder.id,
      balanceBefore,
      amount: -totalAmount,
      balanceAfter,
      type: "purchase",
      description: `API order ${transId}`,
    });

    return {
      orderId: newOrder.id,
      transId,
      balanceAfter,
      deliveryItems,
      allDelivered,
    };
  });

  return {
    success: true,
    message: "Đơn hàng đã được tạo thành công",
    data: {
      orders: [
        {
          id: txResult.orderId,
          trans_id: txResult.transId,
          status: txResult.allDelivered ? "completed" : "processing",
          subtotal_amount: subtotalAmount,
          discount_amount: discountAmount,
          total: totalAmount,
          coupon_code: couponResult?.code ?? null,
        },
      ],
      summary: {
        subtotal_amount: subtotalAmount,
        discount_amount: discountAmount,
        total_amount: totalAmount,
        new_balance: txResult.balanceAfter,
      },
      delivery: {
        items: txResult.deliveryItems,
        delivered_count: txResult.deliveryItems.length,
      },
    },
  };
});
