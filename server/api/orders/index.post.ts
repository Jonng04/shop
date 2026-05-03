import { randomBytes } from "node:crypto";
import { and, eq, gte, inArray, lte, sql } from "drizzle-orm";
import type { User } from "#auth-utils";

import { db } from "../../database";
import { isAllowed } from "../../utils/rate-limit";
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
} from "../../database/schema";
import { type AdminSessionUser } from "../../utils/admin-permissions";
import {
  createActivityLog,
  getRequestContextMeta,
} from "../../utils/activity-log";
import { validateCouponForCart } from "../../utils/coupon";
import { sendOrderConfirmationEmail } from "../../utils/mail";
import { parseCreateOrderBody } from "../../utils/request-validation";
import { processAffiliateCommissionForOrder } from "../../utils/affiliate-commission";

interface SessionUser extends User, AdminSessionUser {}

interface PlanSnapshot {
  id: number;
  status: string | null;
  price: number;
  productId: number | null;
  deliveryType: string | null;
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
  const session = await getUserSession(event);
  const user = session.user as SessionUser | undefined;

  if (!user?.id) {
    throw createError({
      statusCode: 401,
      message: "Vui lòng đăng nhập để mua hàng",
    });
  }

  const userId = Number(user.id);

  // Rate limit: 10 orders per minute per user
  if (!isAllowed(`checkout:${userId}`, 10, 60000)) {
    throw createError({
      statusCode: 429,
      message:
        "Bạn đang tạo quá nhiều đơn hàng. Vui lòng chờ 1 phút rồi thử lại.",
    });
  }
  const { items, couponCode, note } = parseCreateOrderBody(
    await readBody(event)
  );

  if (items.length === 0) {
    throw createError({ statusCode: 400, message: "Giỏ hàng trống" });
  }

  for (const item of items) {
    const normalizedPrice = Number(item.price);

    if (
      !item.productId ||
      !item.planId ||
      !Number.isFinite(normalizedPrice) ||
      normalizedPrice < 0 ||
      !item.quantity
    ) {
      throw createError({
        statusCode: 400,
        message: "Dữ liệu sản phẩm không hợp lệ",
      });
    }

    if (item.quantity < 1) {
      throw createError({
        statusCode: 400,
        message: "Số lượng không hợp lệ, phải ít nhất 1",
      });
    }
  }

  const subtotalAmount = items.reduce(
    (sum, item) => sum + Number(item.price) * Number(item.quantity),
    0
  );

  const dbUser = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: {
      id: true,
      username: true,
      email: true,
      balance: true,
      status: true,
    },
  });

  if (!dbUser) {
    throw createError({ statusCode: 404, message: "Tài khoản không tồn tại" });
  }

  if (dbUser.status !== "active") {
    throw createError({
      statusCode: 403,
      message: "Tài khoản của bạn đã bị khóa",
    });
  }

  const uniquePlanIds = [...new Set(items.map((item) => Number(item.planId)))];

  const planRows = uniquePlanIds.length
    ? await db
        .select({
          id: plans.id,
          status: plans.status,
          price: plans.price,
          productId: plans.productId,
          deliveryType: plans.deliveryType,
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

  const planSnapshots = new Map<number, PlanSnapshot>();

  for (const item of items) {
    const plan = planMap.get(Number(item.planId));

    if (!plan || plan.status !== "active") {
      throw createError({
        statusCode: 400,
        message: `Gói sản phẩm "${item.planName}" không còn hoạt động`,
      });
    }

    if (plan.productId !== item.productId) {
      throw createError({
        statusCode: 400,
        message: "Dữ liệu sản phẩm không hợp lệ",
      });
    }

    // Tính giá thực tế từ flash sale đã load sẵn theo planId
    const flashRow = flashMap.get(Number(plan.id)) || null;

    const planBasePrice = Number(plan.price || 0);
    let effectivePrice = planBasePrice;

    if (flashRow && planBasePrice > 0) {
      const dtype = String(flashRow.discountType ?? "percent");
      const dval = Number(flashRow.discountValue ?? 0);
      const maxD =
        flashRow.maxDiscount != null ? Number(flashRow.maxDiscount) : null;

      if (dtype === "percent") {
        const cut = Math.round((planBasePrice * dval) / 100);
        effectivePrice = Math.max(
          0,
          planBasePrice - (maxD != null ? Math.min(cut, maxD) : cut)
        );
      } else if (dtype === "fixed") {
        effectivePrice = Math.max(
          0,
          planBasePrice - (maxD != null ? Math.min(dval, maxD) : dval)
        );
      }
    }

    if (Number(item.price || 0) !== effectivePrice) {
      throw createError({
        statusCode: 400,
        message: `Giá gói "${item.planName}" đã thay đổi, vui lòng tải lại trang`,
      });
    }

    planSnapshots.set(item.planId, {
      id: plan.id,
      status: plan.status,
      price: effectivePrice,
      productId: plan.productId,
      deliveryType: plan.deliveryType || "manual",
    });
  }

  const couponResult = couponCode
    ? await validateCouponForCart({
        userId,
        couponCode,
        items: items.map((item) => ({
          productId: Number(item.productId),
          quantity: Number(item.quantity),
          price: Number(item.price),
        })),
      })
    : null;

  const discountAmount = Number(couponResult?.discountAmount || 0);
  const totalAmount = Math.max(0, subtotalAmount - discountAmount);
  const balanceBefore = Number(dbUser.balance ?? 0);

  if (balanceBefore < totalAmount) {
    throw createError({
      statusCode: 400,
      message: `Số dư không đủ. Cần ${totalAmount.toLocaleString("vi-VN")}đ, hiện tại ${balanceBefore.toLocaleString("vi-VN")}đ`,
    });
  }

  const transactionResult = await db.transaction(async (tx) => {
    // Khoá dòng user để ngăn race condition khi nhiều request checkout đồng thời
    const [userRows] = await tx.execute(
      sql`SELECT id, balance FROM users WHERE id = ${userId} FOR UPDATE`
    );
    const currentUser = (userRows as unknown as any[])[0] as
      | { id: number; balance: number }
      | undefined;

    if (!currentUser) {
      throw createError({
        statusCode: 404,
        message: "Tài khoản không tồn tại",
      });
    }

    const currentBalance = Number(currentUser.balance || 0);

    if (currentBalance < totalAmount) {
      throw createError({
        statusCode: 400,
        message: `Số dư không đủ. Cần ${totalAmount.toLocaleString("vi-VN")}đ, hiện tại ${currentBalance.toLocaleString("vi-VN")}đ`,
      });
    }

    let newOrder: { id: number } | undefined;
    let orderCode = "";

    for (let attempt = 0; attempt < ORDER_CODE_RETRY_LIMIT; attempt += 1) {
      const candidateCode = generateOrderCode();

      try {
        const [createdOrder] = await tx
          .insert(orders)
          .values({
            orderCode: candidateCode,
            userId,
            orderType: "instant",
            paymentType: "balance",
            couponCode: couponResult?.code ?? null,
            fulfillmentStatus: "pending",
            subtotalAmount,
            discountAmount,
            totalAmount,
            status: "processing",
            customerNote: note,
          })
          .$returningId();

        if (createdOrder?.id) {
          newOrder = createdOrder;
          orderCode = candidateCode;
          break;
        }
      } catch (error: any) {
        if (isDuplicateEntryError(error)) {
          continue;
        }

        throw error;
      }
    }

    if (!newOrder?.id || !orderCode) {
      throw createError({
        statusCode: 500,
        message: "Không thể tạo mã đơn hàng duy nhất, vui lòng thử lại",
      });
    }

    const orderId = newOrder.id;
    const balanceAfter = currentBalance - totalAmount;

    // Trừ số dư nguyên tử: chỉ thực hiện nếu balance thực tế vẫn đủ tại thời điểm UPDATE
    const [deductResult] = await tx.execute(
      sql`UPDATE users SET balance = balance - ${totalAmount} WHERE id = ${userId} AND balance >= ${totalAmount}`
    );

    if ((deductResult as any).affectedRows === 0) {
      throw createError({
        statusCode: 400,
        message: `Số dư không đủ để thanh toán đơn hàng`,
      });
    }

    for (const item of items) {
      const planSnapshot = planSnapshots.get(item.planId);

      if (!planSnapshot) {
        throw createError({
          statusCode: 400,
          message: `Không tìm thấy cấu hình gói "${item.planName}"`,
        });
      }

      const itemSubtotal = Number(item.price) * Number(item.quantity);
      const lineDiscountAmount =
        subtotalAmount > 0
          ? Math.floor((discountAmount * itemSubtotal) / subtotalAmount)
          : 0;
      const baseUnitDiscount =
        item.quantity > 0 ? Math.floor(lineDiscountAmount / item.quantity) : 0;
      const discountRemainder =
        item.quantity > 0 ? lineDiscountAmount % item.quantity : 0;

      for (let q = 0; q < item.quantity; q++) {
        const currentUnitDiscount = Math.min(
          Number(item.price),
          baseUnitDiscount + (q < discountRemainder ? 1 : 0)
        );

        let claimedStock: { id: number; content: string } | null = null;

        if (planSnapshot.deliveryType === "instant") {
          // SELECT FOR UPDATE khoá dòng stock, ngăn 2 request đồng thời claim cùng 1 stock
          const [stockRows] = await tx.execute(
            sql`SELECT id, content FROM stocks WHERE plan_id = ${item.planId} AND status = 'available' ORDER BY id ASC LIMIT 1 FOR UPDATE`
          );

          const stockRow = (stockRows as unknown as any[])[0] as
            | { id: number; content: string }
            | undefined;

          if (!stockRow) {
            throw createError({
              statusCode: 409,
              message: `Gói "${item.planName}" vừa hết hàng, vui lòng thử lại`,
            });
          }

          claimedStock = {
            id: stockRow.id,
            content: stockRow.content,
          };
        }

        await tx
          .insert(orderItems)
          .values({
            orderId,
            productId: item.productId,
            planId: item.planId,
            productName: item.productName,
            planName: item.planName,
            quantity: 1,
            unitPrice: item.price,
            subtotalAmount: item.price,
            couponCode: couponResult?.code ?? null,
            discountAmount: currentUnitDiscount,
            totalAmount: Math.max(0, Number(item.price) - currentUnitDiscount),
            stockId: claimedStock?.id ?? null,
            deliveredContent: claimedStock?.content ?? null,
            status: claimedStock ? "delivered" : "pending",
            deliveredAt: claimedStock ? new Date() : null,
          })
          .$returningId();

        if (claimedStock) {
          await tx
            .update(stocks)
            .set({
              status: "sold",
              orderId,
            })
            .where(eq(stocks.id, claimedStock.id));
        }
      }
    }

    await tx.insert(transactions).values({
      userId,
      orderId,
      balanceBefore: currentBalance,
      amount: -totalAmount,
      balanceAfter,
      type: "purchase",
      description: `Thanh toán đơn hàng ${orderCode}`,
    });

    if (couponResult) {
      await tx.insert(couponUsage).values({
        couponId: couponResult.couponId,
        userId,
        orderId,
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

    const createdItems = await tx.query.orderItems.findMany({
      where: eq(orderItems.orderId, orderId),
      columns: { status: true },
    });
    const isFullyDelivered = createdItems.every(
      (item) => item.status === "delivered"
    );

    await tx
      .update(orders)
      .set({
        fulfillmentStatus: isFullyDelivered ? "delivered" : "pending",
        status: isFullyDelivered ? "completed" : "processing",
        deliveredAt: isFullyDelivered ? new Date() : null,
        completedAt: isFullyDelivered ? new Date() : null,
      })
      .where(eq(orders.id, orderId));

    if (isFullyDelivered) {
      try {
        await processAffiliateCommissionForOrder(tx, orderId);
      } catch {
        // Không block flow mua hàng nếu affiliate xử lý lỗi
      }
    }

    return {
      orderId,
      orderCode,
      isFullyDelivered,
      balanceAfter,
    };
  });

  const meta = getRequestContextMeta(event);
  await createActivityLog({
    actorUserId: userId,
    actorName: dbUser.username,
    actorEmail: dbUser.email,
    actorRole: "user",
    action: "create_order",
    module: "orders",
    target: transactionResult.orderCode,
    description: `Đặt hàng ${items.length} sản phẩm, tổng ${totalAmount.toLocaleString("vi-VN")}đ`,
    level: "success",
    ...meta,
  });

  // Gửi email xác nhận — fire-and-forget, không block response
  (async () => {
    try {
      const purchasedItems = await db.query.orderItems.findMany({
        where: eq(orderItems.orderId, transactionResult.orderId),
        columns: {
          productName: true,
          planName: true,
          quantity: true,
          unitPrice: true,
          totalAmount: true,
          deliveredContent: true,
          status: true,
        },
      });

      await sendOrderConfirmationEmail({
        toEmail: dbUser?.email ?? "",
        toName: dbUser?.username ?? "",
        orderCode: transactionResult.orderCode,
        subtotalAmount,
        discountAmount,
        totalAmount,
        balanceAfter: transactionResult.balanceAfter,
        couponCode: couponResult?.code ?? null,
        isFullyDelivered: transactionResult.isFullyDelivered,
        items: purchasedItems.map((i) => ({
          productName: i.productName ?? "",
          planName: i.planName ?? "",
          quantity: i.quantity ?? 1,
          unitPrice: Number(i.unitPrice ?? 0),
          totalAmount: Number(i.totalAmount ?? 0),
          deliveredContent: i.deliveredContent ?? null,
          status: i.status ?? "pending",
        })),
      });
    } catch {
      // ignore — email lỗi không ảnh hưởng đơn hàng
    }
  })();

  return {
    success: true,
    orderCode: transactionResult.orderCode,
    orderId: transactionResult.orderId,
    subtotalAmount,
    discountAmount,
    totalAmount,
    couponCode: couponResult?.code ?? null,
    balanceAfter: transactionResult.balanceAfter,
    fullyDelivered: transactionResult.isFullyDelivered,
  };
});
