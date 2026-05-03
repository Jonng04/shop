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

  const body = await readBody(event);
  const rawItems = Array.isArray(body?.items) ? body.items : [];

  if (!rawItems.length) {
    throw createError({ statusCode: 400, message: "Giỏ hàng trống" });
  }

  const result = await validateCouponForCart({
    userId: Number(user.id),
    couponCode: code,
    items: rawItems.map((item: any) => ({
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
