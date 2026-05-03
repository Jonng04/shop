import { eq } from "drizzle-orm";
import type { User } from "#auth-utils";

import { db } from "../../../database";
import { coupons } from "../../../database/schema";
import { createActivityLog, getRequestContextMeta } from "../../../utils/activity-log";
import {
  requireAdminPermission,
  type AdminSessionUser,
} from "../../../utils/admin-permissions";


interface AdminUser extends User, AdminSessionUser {
  id?: number;
  username?: string;
  email?: string;
  name?: string;
}

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event);
  const user = session.user as AdminUser;

  await requireAdminPermission(user, "manage_coupons");

  const id = getRouterParam(event, "id");
  if (!id || !Number.isFinite(Number(id))) {
    throw createError({
      statusCode: 400,
      message: "Thiếu ID hoặc ID không hợp lệ",
    });
  }

  try {
    const coupon = await db.query.coupons.findFirst({
      where: eq(coupons.id, Number(id)),
    });

    if (!coupon) {
      throw createError({
        statusCode: 404,
        message: "Mã giảm giá không tồn tại",
      });
    }

    await db.delete(coupons).where(eq(coupons.id, Number(id)));

    const context = getRequestContextMeta(event);
    await createActivityLog({
      actorUserId: Number(user.id || 0) || null,
      actorName: user.username || user.name || "Admin",
      actorEmail: user.email || null,
      actorRole: "admin",
      action: "Xóa mã giảm giá",
      module: "Khuyến mãi",
      target: coupon.code,
      description: `Đã xóa mã giảm giá ${coupon.code}`,
      level: "critical",
      ip: context.ip,
      device: context.device,
      metadata: {
        couponId: Number(id),
        deleted: {
          code: coupon.code,
          discountType: coupon.discountType,
          discountValue: coupon.discountValue,
          status: coupon.status,
        },
      },
    });

    return { success: true, message: `Đã xóa mã giảm giá ${coupon.code}` };
  } catch (error: any) {
    if (error?.statusCode) throw error;

    throw createError({
      statusCode: 500,
      message: "Lỗi hệ thống khi xóa mã giảm giá",
    });
  }
});
