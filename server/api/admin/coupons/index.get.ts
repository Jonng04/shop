import { desc } from "drizzle-orm";
import type { User } from "#auth-utils";

import { db } from "../../../database";
import { coupons } from "../../../database/schema";
import {
  hasAnyAdminPermission,
  requireAdminAccess,
  type AdminSessionUser,
} from "../../../utils/admin-permissions";


interface AdminUser extends User, AdminSessionUser {
}

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event);
  const user = session.user as AdminUser;

  requireAdminAccess(user);

  const allowed = await hasAnyAdminPermission(user, ["view_coupons", "manage_coupons"]);

  if (!allowed) {
    throw createError({
      statusCode: 403,
      message: "Bạn không có quyền xem mã giảm giá",
    });
  }

  try {
    const list = await db.select().from(coupons).orderBy(desc(coupons.id));

    return list.map((item) => ({
      ...item,
      discountValue: Number(item.discountValue || 0),
      maxDiscount: item.maxDiscount ? Number(item.maxDiscount) : null,
      minOrderValue: item.minOrderValue ? Number(item.minOrderValue) : null,
      usageLimit: item.usageLimit ? Number(item.usageLimit) : null,
      usedCount: Number(item.usedCount || 0),
      maxPerUser: item.maxPerUser ? Number(item.maxPerUser) : null,
      // Parse JSON arrays if stored as strings
      applicableProductIds: item.applicableProductIds
        ? JSON.parse(item.applicableProductIds)
        : null,
      applicableCategoryIds: item.applicableCategoryIds
        ? JSON.parse(item.applicableCategoryIds)
        : null,
    }));
  } catch {
    throw createError({
      statusCode: 500,
      message: "Lỗi hệ thống khi lấy danh sách mã giảm giá",
    });
  }
});
