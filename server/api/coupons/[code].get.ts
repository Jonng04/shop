import type { User } from "#auth-utils";

import { type AdminSessionUser } from "../../utils/admin-permissions";
import { validateCouponForCart } from "../../utils/coupon";

interface SessionUser extends User, AdminSessionUser {}

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event);
  const user = session.user as SessionUser | undefined;

  if (!user?.id) {
    throw createError({
      statusCode: 401,
      message: "Vui lòng đăng nhập để áp dụng mã giảm giá",
    });
  }

  const code = getRouterParam(event, "code");
  if (!code) {
    throw createError({ statusCode: 400, message: "Mã giảm giá không hợp lệ" });
  }

  // For GET requests, items can be passed in query string as JSON
  const query = getQuery(event);
  let items: any[] = [];

  if (query.items) {
    try {
      items =
        typeof query.items === "string" ? JSON.parse(query.items) : query.items;
    } catch {
      items = [];
    }
  }

  if (!Array.isArray(items) || items.length === 0) {
    throw createError({ statusCode: 400, message: "Giỏ hàng trống" });
  }

  const result = await validateCouponForCart({
    userId: Number(user.id),
    couponCode: code,
    items: items.map((item: any) => ({
      productId: Number(item.productId),
      quantity: Number(item.quantity || 0),
      price: Number(item.price || 0),
    })),
  });

  if (!result) {
    throw createError({ statusCode: 400, message: "Mã giảm giá không hợp lệ" });
  }

  return result;
});
