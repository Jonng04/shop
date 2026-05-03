import { and, eq, like, or, sql } from "drizzle-orm";
import { db } from "../../../database";
import { categories, plans, products, stocks } from "../../../database/schema";
import { requireApiV1Auth } from "../../../utils/api-v1-auth";

type SortValue = "newest" | "oldest" | "price_asc" | "price_desc" | "bestseller";

export default defineEventHandler(async (event) => {
  await requireApiV1Auth(event);

  const query = getQuery(event);
  const page = Math.max(Number(query.page || 1), 1);
  const limit = Math.min(Math.max(Number(query.limit || 10), 1), 100);
  const categoryId = Number(query.category_id || 0);
  const search = String(query.search || "").trim();
  const sort = String(query.sort || "newest") as SortValue;

  const conditions = [eq(products.status, "active")];
  if (categoryId > 0) {
    conditions.push(eq(products.categoryId, categoryId));
  }
  if (search) {
    conditions.push(
      or(like(products.name, `%${search}%`), like(products.slug, `%${search}%`))!
    );
  }

  const rawProducts = await db.query.products.findMany({
    where: and(...conditions),
    orderBy: (p, helpers) =>
      sort === "oldest" ? [helpers.asc(p.id)] : [helpers.desc(p.id)],
  });

  const mapped = await Promise.all(
    rawProducts.map(async (product) => {
      const category = product.categoryId
        ? await db.query.categories.findFirst({
            where: eq(categories.id, product.categoryId),
            columns: { id: true, name: true, slug: true, image: true },
          })
        : null;

      const planList = await db.query.plans.findMany({
        where: and(eq(plans.productId, product.id), eq(plans.status, "active")),
        orderBy: (pl, { asc: ascHelper }) => [ascHelper(pl.price)],
      });

      const mappedPlans = await Promise.all(
        planList.map(async (plan) => {
          const [countRow] = await db
            .select({ total: sql<number>`count(*)` })
            .from(stocks)
            .where(and(eq(stocks.planId, plan.id), eq(stocks.status, "available")));

          const stockCount = Number(countRow?.total || 0);
          return {
            id: plan.id,
            name: plan.name,
            price: Number(plan.price || 0),
            sale_price: null,
            final_price: Number(plan.price || 0),
            is_instant: (plan.deliveryType || "manual") === "instant",
            duration_type: plan.durationType,
            duration_value: plan.durationValue,
            stock_count: stockCount,
            in_stock:
              (plan.deliveryType || "manual") !== "instant" ? true : stockCount > 0,
            fields: (() => {
              try {
                return plan.fields ? JSON.parse(plan.fields) : [];
              } catch {
                return [];
              }
            })(),
          };
        })
      );

      const minPrice =
        mappedPlans.length > 0
          ? Math.min(...mappedPlans.map((item) => Number(item.final_price || 0)))
          : 0;

      return {
        id: product.id,
        name: product.name,
        slug: product.slug,
        image: product.image,
        description: product.description,
        category,
        plans: mappedPlans,
        _min_price: minPrice,
      };
    })
  );

  if (sort === "price_asc") {
    mapped.sort((a, b) => a._min_price - b._min_price);
  } else if (sort === "price_desc") {
    mapped.sort((a, b) => b._min_price - a._min_price);
  } else if (sort === "bestseller") {
    mapped.sort((a, b) => b.id - a.id);
  }

  const total = mapped.length;
  const totalPages = Math.max(Math.ceil(total / limit), 1);
  const offset = (page - 1) * limit;
  const paged = mapped
    .slice(offset, offset + limit)
    .map(({ _min_price, ...item }) => item);

  return {
    success: true,
    data: {
      products: paged,
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
