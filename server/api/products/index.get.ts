import { and, eq, inArray, like, min, notInArray, or } from "drizzle-orm";
import { db } from "../../database";
import { plans, products } from "../../database/schema";
import { getOrSetReadCache } from "../../utils/api-read-cache";
import { getCatalogCacheVersion } from "../../utils/catalog-cache-version";

// GET /api/products?search=&limit=
export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const q = String(query.search || query.q || "")
    .replace(/\s+/g, " ")
    .trim();
  const limit = Math.min(Math.max(Number(query.limit || 12), 1), 30);

  if (!q) {
    return { items: [] };
  }

  const version = await getCatalogCacheVersion();

  return getOrSetReadCache(
    `products:index:v${version}:q=${q.toLowerCase()}:limit=${limit}`,
    60,
    async () => {
      // Phase 1: index-friendly prefix matching first.
      const prefixKeyword = `${q}%`;
      const prefixMatches = await db.query.products.findMany({
        where: and(
          eq(products.status, "active"),
          or(
            like(products.name, prefixKeyword),
            like(products.slug, prefixKeyword)
          )
        ),
        orderBy: (p, { desc }) => [desc(p.id)],
        limit,
      });

      let productList = prefixMatches;

      // Phase 2: fallback fuzzy matching only if prefix is not enough.
      const remaining = limit - prefixMatches.length;
      if (remaining > 0) {
        const existingIds = prefixMatches.map((p) => p.id);
        const keyword = `%${q}%`;
        const fuzzyWhere = [
          eq(products.status, "active"),
          or(like(products.name, keyword), like(products.slug, keyword)),
        ];

        if (existingIds.length) {
          fuzzyWhere.push(notInArray(products.id, existingIds));
        }

        const fuzzyMatches = await db.query.products.findMany({
          where: and(...fuzzyWhere),
          orderBy: (p, { desc }) => [desc(p.id)],
          limit: remaining,
        });

        productList = [...prefixMatches, ...fuzzyMatches];
      }

      const productIds = productList.map((p) => p.id);
      const minPriceRows =
        productIds.length > 0
          ? await db
              .select({
                productId: plans.productId,
                minPrice: min(plans.price),
              })
              .from(plans)
              .where(
                and(
                  eq(plans.status, "active"),
                  inArray(plans.productId, productIds)
                )
              )
              .groupBy(plans.productId)
          : [];

      // Map min price by productId.
      const minPriceByProduct: Record<number, number | null> = {};
      for (const row of minPriceRows) {
        const productId = Number(row.productId || 0);
        if (!productId) continue;
        minPriceByProduct[productId] = Number(row.minPrice || 0);
      }

      const items = productList.map((p) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        image: p.image,
        minPrice: minPriceByProduct[p.id] ?? null,
      }));

      return { items };
    }
  );
});
