import { and, count, eq } from "drizzle-orm";
import { db } from "../../database";
import { wishlists } from "../../database/schema";

// GET /api/wishlist/count - Get wishlist item count for current user
export default defineEventHandler(async (event) => {
  const session = await getUserSession(event);
  const user = session?.user as any;

  if (!user?.id) {
    return { count: 0 };
  }

  const [row] = await db
    .select({ count: count() })
    .from(wishlists)
    .where(eq(wishlists.userId, Number(user.id)));

  return {
    count: Number(row?.count || 0),
  };
});
