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
  const body = await readBody(event);

  if (body.name !== undefined && body.name.trim().length < 2) {
    throw createError({
      statusCode: 400,
      message: "Tên sản phẩm phải có ít nhất 2 ký tự",
    });
  }

  try {
    const existing = await db.query.products.findFirst({
      where: eq(products.id, Number(id)),
    });

    if (!existing) {
      throw createError({ statusCode: 404, message: "Sản phẩm không tồn tại" });
    }

    const updateData: any = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.slug !== undefined) updateData.slug = body.slug;
    if (body.categoryId !== undefined)
      updateData.categoryId = Number(body.categoryId);
    if (body.image !== undefined) updateData.image = body.image;
    if (body.description !== undefined)
      updateData.description = body.description;
    if (body.deliveryType !== undefined)
      updateData.deliveryType = body.deliveryType;
    if (body.status !== undefined) updateData.status = body.status;

    await db
      .update(products)
      .set(updateData)
      .where(eq(products.id, Number(id)));

    await bumpCatalogCacheVersion();

    const context = getRequestContextMeta(event);
    await createActivityLog({
      actorUserId: Number(user.id || 0) || null,
      actorName: user.username || user.name || "Admin",
      actorEmail: user.email || null,
      actorRole: "admin",
      action: "Cập nhật sản phẩm",
      module: "Sản phẩm",
      target: existing.name,
      description: `Đã cập nhật sản phẩm #${id}`,
      level: "warning",
      ip: context.ip,
      device: context.device,
      metadata: {
        productId: Number(id),
        before: {
          name: existing.name,
          categoryId: existing.categoryId,
          deliveryType: existing.deliveryType,
          status: existing.status,
        },
        after: {
          name: updateData.name ?? existing.name,
          categoryId: updateData.categoryId ?? existing.categoryId,
          deliveryType: updateData.deliveryType ?? existing.deliveryType,
          status: updateData.status ?? existing.status,
        },
      },
    });

    return { success: true, message: "Cập nhật thành công!" };
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || "Lỗi khi cập nhật sản phẩm",
    });
  }
});
