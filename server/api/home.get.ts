import { and, asc, count, desc, eq, inArray } from "drizzle-orm";
import { db } from "../database";
import { categories, plans, products, settings } from "../database/schema";
import { getOrSetReadCache } from "../utils/api-read-cache";
import { getCatalogCacheVersion } from "../utils/catalog-cache-version";

export default defineEventHandler(async () => {
  const version = await getCatalogCacheVersion();

  return getOrSetReadCache(`home:v${version}`, 60, async () => {
    // Active categories with product count
    const categoryList = await db
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
      )
      .orderBy(asc(categories.name));

    // Newest active products (limit 20)
    const productList = await db.query.products.findMany({
      where: eq(products.status, "active"),
      orderBy: (p, { desc }) => [desc(p.id)],
      limit: 20,
    });

    // Min price per product from active plans
    const productIds = productList.map((p) => p.id);
    const allPlans =
      productIds.length > 0
        ? await db.query.plans.findMany({
            where: and(
              inArray(plans.productId, productIds),
              eq(plans.status, "active")
            ),
            orderBy: (pl, { asc }) => [asc(pl.price)],
          })
        : [];

    // Map min price by product
    const minPriceMap = new Map<number, number | null>();
    for (const plan of allPlans) {
      const pid = plan.productId;
      if (
        pid &&
        (!minPriceMap.has(pid) || plan.price < minPriceMap.get(pid)!)
      ) {
        minPriceMap.set(pid, plan.price);
      }
    }

    const productsWithPrice = productList.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      image: p.image,
      categoryId: p.categoryId,
      deliveryType: p.deliveryType,
      minPrice: minPriceMap.get(p.id) ?? null,
    }));

    const homeLeftImageBannersSetting = await db.query.settings.findFirst({
      where: eq(settings.key, "homeLeftImageBanners"),
    });

    const homePromoBannersSetting = await db.query.settings.findFirst({
      where: eq(settings.key, "homePromoBanners"),
    });

    const slidersSetting = await db.query.settings.findFirst({
      where: eq(settings.key, "sliders"),
    });

    let homeLeftImageBanners: Array<{
      image: string;
      href: string;
    }> = [];

    let homePromoBanners: Array<{
      label: string;
      title: string;
      description: string;
      icon: string;
      href: string;
    }> = [];

    let sliders: Array<{
      id: number | string;
      title: string;
      image: string;
      order: number;
      active: boolean;
    }> = [];

    try {
      const parsed = JSON.parse(homeLeftImageBannersSetting?.value || "[]");
      if (Array.isArray(parsed)) {
        homeLeftImageBanners = parsed.map((item) => ({
          image: String(item?.image || ""),
          href: String(item?.href || ""),
        }));
      }
    } catch {
      homeLeftImageBanners = [];
    }

    try {
      const parsed = JSON.parse(homePromoBannersSetting?.value || "[]");
      if (Array.isArray(parsed)) {
        homePromoBanners = parsed.map((item) => ({
          label: String(item?.label || ""),
          title: String(item?.title || ""),
          description: String(item?.description || ""),
          icon: String(item?.icon || ""),
          href: String(item?.href || ""),
        }));
      }
    } catch {
      homePromoBanners = [];
    }

    try {
      const parsed = JSON.parse(slidersSetting?.value || "[]");
      if (Array.isArray(parsed)) {
        sliders = parsed
          .map((item, index) => ({
            id: item?.id ?? index,
            title: String(item?.title || ""),
            image: String(item?.image || ""),
            order: Number(item?.order ?? index),
            active: item?.active !== false,
          }))
          .filter((item) => item.image && item.active)
          .sort((a, b) => a.order - b.order);
      }
    } catch {
      sliders = [];
    }

    return {
      categories: categoryList,
      products: productsWithPrice,
      homeLeftImageBanners,
      homePromoBanners,
      sliders,
    };
  });
});
