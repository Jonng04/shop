import { and, count, eq } from "drizzle-orm";
import { db } from "../../database";
import { wishlists, products } from "../../database/schema";

// POST /api/wishlist/:productId - Add to wishlist
export default defineEventHandler(async (event) => {
  const session = await getUserSession(event);
  const user = session?.user as any;

  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Bạn cần đăng nhập" });
  }

  const productId = Number(getRouterParam(event, "productId"));

  if (!productId || isNaN(productId)) {
    throw createError({ statusCode: 400, message: "productId không hợp lệ" });
  }

  const product = await db.query.products.findFirst({
    where: and(eq(products.id, productId), eq(products.status, "active")),
    columns: { id: true },
  });

  if (!product) {
    throw createError({ statusCode: 404, message: "Sản phẩm không tồn tại" });
  }

  const existing = await db.query.wishlists.findFirst({
    where: and(
      eq(wishlists.userId, Number(user.id)),
      eq(wishlists.productId, productId)
    ),
    columns: { id: true },
  });

  if (existing) {
    const [row] = await db
      .select({ count: count() })
      .from(wishlists)
      .where(eq(wishlists.userId, Number(user.id)));

    return {
      wishlisted: true,
      count: Number(row?.count || 0),
    };
  }

  await db.insert(wishlists).values({
    userId: Number(user.id),
    productId,
  });

  const [row] = await db
    .select({ count: count() })
    .from(wishlists)
    .where(eq(wishlists.userId, Number(user.id)));

  return {
    wishlisted: true,
    count: Number(row?.count || 0),
  };
});
