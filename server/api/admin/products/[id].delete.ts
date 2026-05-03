import { db } from "../../../database";
import { products } from "../../../database/schema";
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
  await requireAdminPermission(user, "manage_products");

  const id = getRouterParam(event, "id");
  if (!id) throw createError({ statusCode: 400, message: "Thiếu ID" });

  try {
    const product = await db.query.products.findFirst({
      where: eq(products.id, Number(id)),
    });

    if (!product) {
      throw createError({ statusCode: 404, message: "Sản phẩm không tồn tại" });
    }

    await db.delete(products).where(eq(products.id, Number(id)));

    await bumpCatalogCacheVersion();

    const context = getRequestContextMeta(event);
    await createActivityLog({
      actorUserId: Number(user.id || 0) || null,
      actorName: user.username || user.name || "Admin",
      actorEmail: user.email || null,
      actorRole: "admin",
      action: "Xóa sản phẩm",
      module: "Sản phẩm",
      target: product.name,
      description: `Đã xóa sản phẩm #${id}`,
      level: "critical",
      ip: context.ip,
      device: context.device,
      metadata: {
        productId: Number(id),
        deleted: {
          name: product.name,
          categoryId: product.categoryId,
          deliveryType: product.deliveryType,
          status: product.status,
        },
      },
    });

    return { success: true, message: "Đã xóa sản phẩm thành công!" };
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      message: "Lỗi hệ thống khi xóa sản phẩm",
    });
  }
});
