import { db } from "../../../database";
import { plans } from "../../../database/schema";
import { eq } from "drizzle-orm";
import type { User } from "#auth-utils";
import {
  createActivityLog,
  getRequestContextMeta,
} from "../../../utils/activity-log";
import {
  requireAdminPermission,
  type AdminSessionUser,
} from "../../../utils/admin-permissions";
import { bumpCatalogCacheVersion } from "../../../utils/catalog-cache-version";

interface AdminUser extends User, AdminSessionUser {
  id?: number;
  username?: string;
  email?: string;
  name?: string;
}

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event);
  const user = session.user as AdminUser;
  await requireAdminPermission(user, "manage_plans");

  const id = getRouterParam(event, "id");
  if (!id) throw createError({ statusCode: 400, message: "Thiếu ID" });

  try {
    const record = await db
      .select()
      .from(plans)
      .where(eq(plans.id, Number(id)))
      .limit(1);

    const plan = record[0];

    if (!plan) {
      throw createError({ statusCode: 404, message: "Gói không tồn tại" });
    }

    await db.delete(plans).where(eq(plans.id, Number(id)));

    await bumpCatalogCacheVersion();

    const context = getRequestContextMeta(event);
    await createActivityLog({
      actorUserId: Number(user.id || 0) || null,
      actorName: user.username || user.name || "Admin",
      actorEmail: user.email || null,
      actorRole: "admin",
      action: "Xóa gói sản phẩm",
      module: "Gói sản phẩm",
      target: plan.name,
      description: `Đã xóa gói sản phẩm #${id}`,
      level: "critical",
      ip: context.ip,
      device: context.device,
      metadata: {
        planId: Number(id),
        deleted: {
          productId: plan.productId ?? null,
          name: plan.name,
          price: plan.price,
          status: plan.status ?? null,
        },
      },
    });

    return { success: true, message: "Đã xóa gói sản phẩm" };
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || "Lỗi xóa gói",
    });
  }
});
