import { and, eq, inArray, sql } from "drizzle-orm";

import { db } from "../database";
import { couponUsage, coupons, products } from "../database/schema";
import { parseBusinessDateTimeInput } from "../../shared/timezone";

export interface CouponCartItemInput {
  productId: number;
  quantity: number;
  price: number;
}

export interface CouponValidationResult {
  couponId: number;
  code: string;
  discountType: string;
  discountValue: number;
  discountAmount: number;
  totalBefore: number;
  totalAfter: number;
}

const parseJsonNumberArray = (value?: string | null) => {
  if (!value) return [];

  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => Number(item))
      .filter((item) => Number.isFinite(item));
  } catch {
    return [];
  }
};

const getSafeDateTime = (value: unknown) => {
  if (!value) return null;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const parsedBusiness = parseBusinessDateTimeInput(value)?.dateValue;
  if (parsedBusiness) {
    return parsedBusiness;
  }

  const fallback = new Date(String(value));
  return Number.isNaN(fallback.getTime()) ? null : fallback;
};

export async function validateCouponForCart(params: {
  userId: number;
  couponCode?: string | null;
  items: CouponCartItemInput[];
}) {
  const code = String(params.couponCode || "")
    .trim()
    .toUpperCase();

  const totalBefore = params.items.reduce(
    (sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0),
    0
  );

  if (!code) {
    return null;
  }

  const coupon = await db.query.coupons.findFirst({
    where: eq(coupons.code, code),
  });

  if (!coupon) {
    throw createError({
      statusCode: 404,
      message: "Mã giảm giá không tồn tại",
    });
  }

  if (coupon.status !== "active") {
    throw createError({
      statusCode: 400,
      message: "Mã giảm giá hiện không khả dụng",
    });
  }

  const now = new Date();
  const startAtDate = getSafeDateTime(coupon.startAt);
  const expiryDate = getSafeDateTime(coupon.expiryDate);

  if (startAtDate && startAtDate > now) {
    throw createError({
      statusCode: 400,
      message: "Mã giảm giá chưa đến thời gian áp dụng",
    });
  }

  if (expiryDate && expiryDate < now) {
    throw createError({
      statusCode: 400,
      message: "Mã giảm giá đã hết hạn",
    });
  }

  if (coupon.minOrderValue && totalBefore < Number(coupon.minOrderValue)) {
    throw createError({
      statusCode: 400,
      message: `Đơn hàng cần tối thiểu ${Number(coupon.minOrderValue).toLocaleString("vi-VN")}đ để dùng mã này`,
    });
  }

  if (
    coupon.usageLimit !== null &&
    coupon.usageLimit !== undefined &&
    Number(coupon.usedCount || 0) >= Number(coupon.usageLimit)
  ) {
    throw createError({
      statusCode: 400,
      message: "Mã giảm giá đã hết lượt sử dụng",
    });
  }

  if (coupon.maxPerUser) {
    const [usageRow] = await db
      .select({ count: sql<number>`count(*)` })
      .from(couponUsage)
      .where(
        and(
          eq(couponUsage.couponId, coupon.id),
          eq(couponUsage.userId, params.userId),
          eq(couponUsage.status, "applied")
        )
      );

    if (Number(usageRow?.count || 0) >= Number(coupon.maxPerUser)) {
      throw createError({
        statusCode: 400,
        message: "Bạn đã dùng hết số lượt cho mã giảm giá này",
      });
    }
  }

  const productIds = [...new Set(params.items.map((item) => item.productId))];
  const applicableProductIds = parseJsonNumberArray(
    coupon.applicableProductIds
  );
  const applicableCategoryIds = parseJsonNumberArray(
    coupon.applicableCategoryIds
  );

  if (applicableProductIds.length > 0) {
    const hasApplicableProduct = productIds.some((id) =>
      applicableProductIds.includes(id)
    );

    if (!hasApplicableProduct) {
      throw createError({
        statusCode: 400,
        message: "Mã giảm giá không áp dụng cho sản phẩm trong giỏ hàng",
      });
    }
  }

  if (applicableCategoryIds.length > 0) {
    const productRows =
      productIds.length > 0
        ? await db
            .select({ id: products.id, categoryId: products.categoryId })
            .from(products)
            .where(inArray(products.id, productIds))
        : [];

    const hasApplicableCategory = productRows.some((row) =>
      applicableCategoryIds.includes(Number(row.categoryId || 0))
    );

    if (!hasApplicableCategory) {
      throw createError({
        statusCode: 400,
        message: "Mã giảm giá không áp dụng cho danh mục trong giỏ hàng",
      });
    }
  }

  let discountAmount = 0;

  if (coupon.discountType === "percent") {
    discountAmount = Math.floor(
      (totalBefore * Number(coupon.discountValue || 0)) / 100
    );

    if (coupon.maxDiscount) {
      discountAmount = Math.min(discountAmount, Number(coupon.maxDiscount));
    }
  } else {
    discountAmount = Number(coupon.discountValue || 0);
  }

  discountAmount = Math.max(0, Math.min(discountAmount, totalBefore));

  return {
    couponId: coupon.id,
    code: coupon.code,
    discountType: String(coupon.discountType || "fixed"),
    discountValue: Number(coupon.discountValue || 0),
    discountAmount,
    totalBefore,
    totalAfter: totalBefore - discountAmount,
  } satisfies CouponValidationResult;
}
