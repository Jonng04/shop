import { and, count, eq } from "drizzle-orm";
import { db } from "../../database";
import { categories, products } from "../../database/schema";
import { getOrSetReadCache } from "../../utils/api-read-cache";
import { getCatalogCacheVersion } from "../../utils/catalog-cache-version";

export default defineEventHandler(async () => {
  const version = await getCatalogCacheVersion();

  return getOrSetReadCache(`categories:index:v${version}`, 60, async () => {
    const list = await db
      .select({
        id: categories.id,
        name: categories.name,
        slug: categories.slug,
        image: categories.image,
        productCount: count(products.id),
      })
      .from(categories)
      .leftJoin(
        products,
        and(
          eq(products.categoryId, categories.id),
          eq(products.status, "active")
        )
      )
      .where(eq(categories.status, "active"))
      .groupBy(
        categories.id,
        categories.name,
        categories.slug,
        categories.image
      );

    return list;
  });
});
