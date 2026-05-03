import { and, eq, or, inArray } from "drizzle-orm";
import { db } from "../../database";
import { categories, plans, products } from "../../database/schema";

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, "id");
  if (!slug)
    throw createError({ statusCode: 400, message: "Thiếu slug danh mục" });

  // Support both numeric ID (legacy) and slug
  const isNumeric = /^\d+$/.test(slug);
  const category = await db.query.categories.findFirst({
    where: isNumeric
      ? and(eq(categories.id, Number(slug)), eq(categories.status, "active"))
      : and(eq(categories.slug, slug), eq(categories.status, "active")),
  });

  if (!category)
    throw createError({ statusCode: 404, message: "Danh mục không tồn tại" });

  const productList = await db.query.products.findMany({
    where: and(
      eq(products.categoryId, category.id),
      eq(products.status, "active")
    ),
  });

  const productIds = productList.map((p) => p.id);

  const planList =
    productIds.length > 0
      ? await db.query.plans.findMany({
          where: and(
            inArray(plans.productId, productIds),
            eq(plans.status, "active")
          ),
        })
      : [];

  const plansByProduct: Record<number, typeof planList> = {};
  for (const plan of planList) {
    const pid = plan.productId;
    if (!pid) continue;
    if (!plansByProduct[pid]) plansByProduct[pid] = [];
    plansByProduct[pid].push(plan);
  }

  const productsWithPlans = productList.map((p) => ({
    ...p,
    plans: plansByProduct[p.id] || [],
  }));

  return {
    category,
    products: productsWithPlans,
  };
});
