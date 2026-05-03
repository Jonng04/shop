import { and, count, eq } from "drizzle-orm";
import { db } from "../../../database";
import { categories, products } from "../../../database/schema";
import { requireApiV1Auth } from "../../../utils/api-v1-auth";

export default defineEventHandler(async (event) => {
  await requireApiV1Auth(event);

  const list = await db
    .select({
      id: categories.id,
      name: categories.name,
      slug: categories.slug,
      image: categories.image,
      product_count: count(products.id),
    })
    .from(categories)
    .leftJoin(
      products,
      and(eq(products.categoryId, categories.id), eq(products.status, "active"))
    )
    .where(eq(categories.status, "active"))
    .groupBy(categories.id, categories.name, categories.slug, categories.image);

  return {
    success: true,
    data: {
      categories: list,
    },
  };
});

