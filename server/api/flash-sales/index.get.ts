import { and, count, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "../../database";
import { flashSaleItems, flashSales, plans, products, stocks } from "../../database/schema";

/**
 * GET /api/flash-sales
 * Trả về danh sách flash sale đang chạy (status=running, trong khoảng startAt–endAt)
 * cùng với các items gồm giá gốc, giá sale, % giảm, số lượng tồn kho.
 */
export default defineEventHandler(async () => {
  const now = new Date();

  // 1. Lấy tất cả items của flash sale đang running trong thời gian hợp lệ
  const rows = await db
    .select({
      // Flash sale
      saleId:    flashSales.id,
      saleName:  flashSales.name,
      saleEndAt: flashSales.endAt,

      // Flash sale item
      itemId:        flashSaleItems.id,
      discountType:  flashSaleItems.discountType,
      discountValue: flashSaleItems.discountValue,
      maxDiscount:   flashSaleItems.maxDiscount,
      quantityLimit: flashSaleItems.quantityLimit,
      soldCount:     flashSaleItems.soldCount,

      // Plan
      planId:    plans.id,
      planName:  plans.name,
      planPrice: plans.price,
      planImage: plans.image,

      // Product
      productId:    products.id,
      productName:  products.name,
      productSlug:  products.slug,
      productImage: products.image,
    })
    .from(flashSales)
    .innerJoin(flashSaleItems, eq(flashSaleItems.flashSaleId, flashSales.id))
    .innerJoin(plans,          eq(flashSaleItems.planId,      plans.id))
    .innerJoin(products,       eq(flashSaleItems.productId,   products.id))
    .where(
      and(
        eq(flashSales.status, "running"),
        eq(products.status,   "active"),
        eq(plans.status,      "active"),
        lte(flashSales.startAt, now),
        gte(flashSales.endAt,   now),
      )
    )
    .limit(12);

  if (rows.length === 0) {
    return { endAt: null, items: [] };
  }

  // 2. Đếm stock available cho các plan liên quan
  const planIds = [...new Set(rows.map((r) => Number(r.planId)))];

  const stockRows = await db
    .select({
      planId:         stocks.planId,
      availableCount: count().as("available_count"),
    })
    .from(stocks)
    .where(
      and(
        eq(stocks.status, "available"),
        sql`${stocks.planId} IN (${sql.raw(planIds.join(","))})`
      )
    )
    .groupBy(stocks.planId);

  const stockMap = new Map<number, number>();
  for (const s of stockRows) {
    if (s.planId != null) stockMap.set(Number(s.planId), Number(s.availableCount));
  }

  // 3. Tính giá sale và build response
  const endAt = rows[0]?.saleEndAt ?? null;

  const items = rows.map((row) => {
    const originalPrice  = Number(row.planPrice  ?? 0);
    const discountType   = String(row.discountType  ?? "percent");
    const discountValue  = Number(row.discountValue ?? 0);
    const maxDiscount    = row.maxDiscount != null ? Number(row.maxDiscount) : null;

    let salePrice       = originalPrice;
    let discountPercent = 0;

    if (originalPrice > 0) {
      if (discountType === "percent") {
        const cut = Math.round((originalPrice * discountValue) / 100);
        const actualCut = maxDiscount != null ? Math.min(cut, maxDiscount) : cut;
        salePrice       = Math.max(0, originalPrice - actualCut);
        discountPercent = Math.round((actualCut / originalPrice) * 100);
      } else if (discountType === "fixed") {
        const actualCut = maxDiscount != null ? Math.min(discountValue, maxDiscount) : discountValue;
        salePrice       = Math.max(0, originalPrice - actualCut);
        discountPercent = Math.round((actualCut / originalPrice) * 100);
      }
    }

    const planId        = Number(row.planId);
    const stockAvail    = stockMap.get(planId) ?? 0;
    const quantityLimit = Number(row.quantityLimit ?? 0);
    const soldCount     = Number(row.soldCount     ?? 0);

    return {
      itemId:         Number(row.itemId),
      saleId:         Number(row.saleId),
      planId,
      productId:      Number(row.productId),
      productName:    row.productName,
      productSlug:    row.productSlug,
      planName:       row.planName,
      image:          row.planImage || row.productImage || null,
      originalPrice,
      salePrice,
      discountPercent,
      // quantityLimit = 0 → không giới hạn, dùng stockAvail thay thế
      total:          quantityLimit > 0 ? quantityLimit : stockAvail,
      sold:           soldCount,
    };
  });

  return { endAt, items };
});
