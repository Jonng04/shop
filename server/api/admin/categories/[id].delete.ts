import { db } from "../../../database";
import { categories } from "../../../database/schema";
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
  await requireAdminPermission(user, "manage_categories");

  const id = getRouterParam(event, "id");
  if (!id) throw createError({ statusCode: 400, message: "Thiếu ID danh mục" });

  try {
    const existing = await db.query.categories.findFirst({
      where: eq(categories.id, Number(id)),
    });

    if (!existing) {
      throw createError({ statusCode: 404, message: "Danh mục không tồn tại" });
    }

    await db.delete(categories).where(eq(categories.id, Number(id)));

    await bumpCatalogCacheVersion();

    const context = getRequestContextMeta(event);
    await createActivityLog({
      actorUserId: Number(user.id || 0) || null,
      actorName: user.username || user.name || "Admin",
      actorEmail: user.email || null,
      actorRole: "admin",
      action: "Xóa danh mục",
      module: "Danh mục",
      target: existing.name,
      description: `Đã xóa danh mục #${id}`,
      level: "critical",
      ip: context.ip,
      device: context.device,
      metadata: {
        categoryId: Number(id),
        deleted: {
          name: existing.name,
          image: existing.image,
          status: existing.status,
        },
      },
    });

    return { success: true, message: "Đã xóa danh mục thành công!" };
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      message:
        "Lỗi hệ thống khi xóa danh mục. Có thể có sản phẩm đang dùng danh mục này.",
    });
  }
});
