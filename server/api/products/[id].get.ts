import { and, count, eq, gte, inArray, lte, ne } from "drizzle-orm";
import { db } from "../../database";
import {
  categories,
  flashSaleItems,
  flashSales,
  plans,
  products,
  stocks,
} from "../../database/schema";

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, "id");
  if (!slug)
    throw createError({ statusCode: 400, message: "Thiếu slug sản phẩm" });

  // Support both numeric ID (legacy) and slug
  const isNumeric = /^\d+$/.test(slug);
  const product = await db.query.products.findFirst({
    where: isNumeric
      ? and(eq(products.id, Number(slug)), eq(products.status, "active"))
      : and(eq(products.slug, slug), eq(products.status, "active")),
  });

  if (!product)
    throw createError({ statusCode: 404, message: "Sản phẩm không tồn tại" });

  const category = product.categoryId
    ? await db.query.categories.findFirst({
        where: eq(categories.id, product.categoryId),
      })
    : null;

  const planList = await db.query.plans.findMany({
    where: and(eq(plans.productId, product.id), eq(plans.status, "active")),
  });

  const planIds = planList.map((p) => p.id);

  // Stock count per plan
  const stockCountRows =
    planIds.length > 0
      ? await db
          .select({ planId: stocks.planId, count: count() })
          .from(stocks)
          .where(
            and(inArray(stocks.planId, planIds), eq(stocks.status, "available"))
          )
          .groupBy(stocks.planId)
      : [];

  const stockCountMap = new Map(
    stockCountRows.map((row) => [row.planId, row.count])
  );

  // Flash sale discount đang chạy cho các plan này
  const now = new Date();
  const flashRows =
    planIds.length > 0
      ? await db
          .select({
            planId:        flashSaleItems.planId,
            discountType:  flashSaleItems.discountType,
            discountValue: flashSaleItems.discountValue,
            maxDiscount:   flashSaleItems.maxDiscount,
            saleEndAt:     flashSales.endAt,
          })
          .from(flashSaleItems)
          .innerJoin(flashSales, eq(flashSaleItems.flashSaleId, flashSales.id))
          .where(
            and(
              inArray(flashSaleItems.planId, planIds),
              eq(flashSales.status, "running"),
              lte(flashSales.startAt, now),
              gte(flashSales.endAt, now)
            )
          )
      : [];

  // Map planId → flash sale discount
  const flashMap = new Map<
    number,
    { discountType: string; discountValue: number; maxDiscount: number | null; saleEndAt: Date | null }
  >();
  for (const row of flashRows) {
    if (row.planId != null) {
      flashMap.set(Number(row.planId), {
        discountType:  String(row.discountType  ?? "percent"),
        discountValue: Number(row.discountValue ?? 0),
        maxDiscount:   row.maxDiscount != null ? Number(row.maxDiscount) : null,
        saleEndAt:     row.saleEndAt ?? null,
      });
    }
  }

  const plansWithStock = planList.map((plan) => {
    const flash = flashMap.get(plan.id);
    let salePrice: number | null = null;
    let discountPercent = 0;

    if (flash && plan.price > 0) {
      if (flash.discountType === "percent") {
        const cut = Math.round((plan.price * flash.discountValue) / 100);
        const actualCut =
          flash.maxDiscount != null ? Math.min(cut, flash.maxDiscount) : cut;
        salePrice       = Math.max(0, plan.price - actualCut);
        discountPercent = Math.round((actualCut / plan.price) * 100);
      } else if (flash.discountType === "fixed") {
        const actualCut =
          flash.maxDiscount != null
            ? Math.min(flash.discountValue, flash.maxDiscount)
            : flash.discountValue;
        salePrice       = Math.max(0, plan.price - actualCut);
        discountPercent = Math.round((actualCut / plan.price) * 100);
      }
    }

    return {
      ...plan,
      stockCount:     stockCountMap.get(plan.id) ?? 0,
      salePrice,
      discountPercent,
      saleEndAt:      flash?.saleEndAt?.toISOString() ?? null,
    };
  });

  // Related products (same category, exclude current)
  const relatedList = product.categoryId
    ? await db.query.products.findMany({
        where: and(
          eq(products.categoryId, product.categoryId),
          eq(products.status, "active"),
          ne(products.id, product.id)
        ),
        limit: 6,
      })
    : [];

  const relatedProductIds = relatedList.map((p) => p.id);
  const relatedPlans =
    relatedProductIds.length > 0
      ? await db.query.plans.findMany({
          where: and(
            inArray(plans.productId, relatedProductIds),
            eq(plans.status, "active")
          ),
          orderBy: (pl, { asc }) => [asc(pl.price)],
        })
      : [];

  const minPriceMap = new Map<number, number | null>();
  for (const plan of relatedPlans) {
    const pid = plan.productId;
    if (pid && (!minPriceMap.has(pid) || plan.price < minPriceMap.get(pid)!)) {
      minPriceMap.set(pid, plan.price);
    }
  }

  const related = relatedList.map((p) => ({
    ...p,
    minPrice: minPriceMap.get(p.id) ?? null,
  }));

  return {
    product,
    category: category ?? null,
    plans: plansWithStock,
    related,
  };
});
