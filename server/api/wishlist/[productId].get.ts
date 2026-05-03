import { and, eq } from "drizzle-orm";
import { db } from "../../database";
import { wishlists } from "../../database/schema";

// GET /api/wishlist/:productId - Check wishlist status
export default defineEventHandler(async (event) => {
  const session = await getUserSession(event);
  const user = session?.user as any;

  if (!user?.id) {
    return { wishlisted: false };
  }

  const productId = Number(getRouterParam(event, "productId"));

  if (!productId || isNaN(productId)) {
    return { wishlisted: false };
  }

  const existing = await db.query.wishlists.findFirst({
    where: and(
      eq(wishlists.userId, Number(user.id)),
      eq(wishlists.productId, productId)
    ),
    columns: { id: true },
  });

  return { wishlisted: !!existing };
});
