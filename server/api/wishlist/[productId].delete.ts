import { and, count, eq } from "drizzle-orm";
import { db } from "../../database";
import { wishlists } from "../../database/schema";

// DELETE /api/wishlist/:productId - Remove from wishlist
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

  await db
    .delete(wishlists)
    .where(
      and(
        eq(wishlists.userId, Number(user.id)),
        eq(wishlists.productId, productId)
      )
    );

  const [row] = await db
    .select({ count: count() })
    .from(wishlists)
    .where(eq(wishlists.userId, Number(user.id)));

  return {
    wishlisted: false,
    count: Number(row?.count || 0),
  };
});
