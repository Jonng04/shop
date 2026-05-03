import { eq } from "drizzle-orm";
import { db } from "../../database";
import { wishlists, products, categories, plans } from "../../database/schema";

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event);
  const user = session?.user as any;

  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Bạn cần đăng nhập" });
  }

  const rows = await db
    .select({
      wishlistId: wishlists.id,
      createdAt: wishlists.createdAt,
      product: {
        id: products.id,
        name: products.name,
        slug: products.slug,
        image: products.image,
        status: products.status,
        categoryId: products.categoryId,
      },
    })
    .from(wishlists)
    .leftJoin(products, eq(wishlists.productId, products.id))
    .where(eq(wishlists.userId, Number(user.id)));

  // Lấy danh sách categoryId cần query
  const categoryIds = [
    ...new Set(rows.map((r) => r.product?.categoryId).filter(Boolean)),
  ] as number[];

  const categoryMap: Record<number, { id: number; name: string }> = {};
  if (categoryIds.length > 0) {
    const cats = await db.query.categories.findMany({
      where: (c, { inArray }) => inArray(c.id, categoryIds),
      columns: { id: true, name: true },
    });
    for (const cat of cats) categoryMap[cat.id] = cat;
  }

  // Lấy giá thấp nhất của từng sản phẩm
  const productIds = rows.map((r) => r.product?.id).filter(Boolean) as number[];
  const planMap: Record<number, number> = {};
  if (productIds.length > 0) {
    const planRows = await db.query.plans.findMany({
      where: (p, { and, inArray, eq }) =>
        and(inArray(p.productId, productIds), eq(p.status, "active")),
      columns: { productId: true, price: true },
    });
    for (const plan of planRows) {
      if (!plan.productId) continue;
      const current = planMap[plan.productId];
      if (current === undefined || plan.price < current) {
        planMap[plan.productId] = plan.price;
      }
    }
  }

  return rows.map((r) => ({
    wishlistId: r.wishlistId,
    addedAt: r.createdAt,
    product: r.product
      ? {
          ...r.product,
          category: r.product.categoryId
            ? categoryMap[r.product.categoryId] || null
            : null,
          minPrice: planMap[r.product.id] ?? null,
        }
      : null,
  }));
});
