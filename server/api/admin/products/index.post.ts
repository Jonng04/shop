import { db } from "../../../database";
import { products } from "../../../database/schema";
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

  const body = await readBody(event);
  if (!body.name || body.name.trim().length < 2) {
    throw createError({
      statusCode: 400,
      message: "Tên sản phẩm phải có ít nhất 2 ký tự",
    });
  }
  if (!body.categoryId) {
    throw createError({ statusCode: 400, message: "Vui lòng chọn danh mục" });
  }

  try {
    const result = await db
      .insert(products)
      .values({
        name: body.name,
        slug: body.slug || null,
        categoryId: Number(body.categoryId),
        image: body.image || null,
        description: body.description || null,
        deliveryType: body.deliveryType || "manual",
        status: body.status || "active",
      })
      .$returningId();

    await bumpCatalogCacheVersion();

    const context = getRequestContextMeta(event);
    await createActivityLog({
      actorUserId: Number(user.id || 0) || null,
      actorName: user.username || user.name || "Admin",
      actorEmail: user.email || null,
      actorRole: "admin",
      action: "Tạo sản phẩm",
      module: "Sản phẩm",
      target: body.name,
      description: `Đã tạo sản phẩm mới: ${body.name}`,
      level: "success",
      ip: context.ip,
      device: context.device,
      metadata: {
        productId: result?.[0]?.id || null,
        name: body.name,
        categoryId: Number(body.categoryId),
        deliveryType: body.deliveryType || "manual",
        status: body.status || "active",
      },
    });

    return {
      success: true,
      message: "Thành công!",
      id: result?.[0]?.id || null,
    };
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      message: "Lỗi hệ thống khi thêm sản phẩm",
    });
  }
});
