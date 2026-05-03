import { eq } from "drizzle-orm";
import type { User } from "#auth-utils";

import { db } from "../../../database";
import { coupons } from "../../../database/schema";
import {
  hasAnyAdminPermission,
  requireAdminAccess,
  type AdminSessionUser,
} from "../../../utils/admin-permissions";

interface AdminUser extends User, AdminSessionUser {}

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event);
  const user = session.user as AdminUser;

  requireAdminAccess(user);

  const allowed = await hasAnyAdminPermission(user, [
    "view_coupons",
    "manage_coupons",
  ]);

  if (!allowed) {
    throw createError({
      statusCode: 403,
      message: "Bạn không có quyền xem mã giảm giá",
    });
  }

  const id = Number(getRouterParam(event, "id") || 0);
  if (!id) {
    throw createError({
      statusCode: 400,
      message: "Thiếu ID hoặc ID không hợp lệ",
    });
  }

  const coupon = await db.query.coupons.findFirst({
    where: eq(coupons.id, id),
  });

  if (!coupon) {
    throw createError({
      statusCode: 404,
      message: "Mã giảm giá không tồn tại",
    });
  }

  return {
    ...coupon,
    discountValue: Number(coupon.discountValue || 0),
    maxDiscount: coupon.maxDiscount ? Number(coupon.maxDiscount) : null,
    minOrderValue: coupon.minOrderValue ? Number(coupon.minOrderValue) : null,
    usageLimit: coupon.usageLimit ? Number(coupon.usageLimit) : null,
    usedCount: Number(coupon.usedCount || 0),
    maxPerUser: coupon.maxPerUser ? Number(coupon.maxPerUser) : null,
    applicableProductIds: coupon.applicableProductIds
      ? JSON.parse(coupon.applicableProductIds)
      : [],
    applicableCategoryIds: coupon.applicableCategoryIds
      ? JSON.parse(coupon.applicableCategoryIds)
      : [],
  };
});
