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

const normalizeOptionalString = (value: unknown) => {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized ? normalized : null;
};

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event);
  const user = session.user as AdminUser;
  await requireAdminPermission(user, "manage_categories");

  const id = getRouterParam(event, "id");
  const body = await readBody(event);
  const normalizedName =
    body?.name === undefined ? undefined : String(body.name || "").trim();
  const normalizedSlug =
    body?.slug === undefined ? undefined : normalizeOptionalString(body.slug);
  const normalizedImage =
    body?.image === undefined ? undefined : normalizeOptionalString(body.image);
  const normalizedStatus =
    body?.status === undefined
      ? undefined
      : body.status === "hidden"
        ? "hidden"
        : "active";

  if (!id) throw createError({ statusCode: 400, message: "Thiếu ID danh mục" });

  if (normalizedName !== undefined && normalizedName.length < 2) {
    throw createError({
      statusCode: 400,
      message: "Tên danh mục phải có ít nhất 2 ký tự",
    });
  }

  try {
    const existing = await db.query.categories.findFirst({
      where: eq(categories.id, Number(id)),
    });

    if (!existing) {
      throw createError({ statusCode: 404, message: "Danh mục không tồn tại" });
    }

    const updateData: any = {};
    if (normalizedName !== undefined) updateData.name = normalizedName;
    if (normalizedSlug !== undefined) updateData.slug = normalizedSlug;
    if (normalizedImage !== undefined) updateData.image = normalizedImage;
    if (normalizedStatus !== undefined) updateData.status = normalizedStatus;

    await db
      .update(categories)
      .set(updateData)
      .where(eq(categories.id, Number(id)));

    await bumpCatalogCacheVersion();

    const context = getRequestContextMeta(event);
    await createActivityLog({
      actorUserId: Number(user.id || 0) || null,
      actorName: user.username || user.name || "Admin",
      actorEmail: user.email || null,
      actorRole: "admin",
      action: "Cập nhật danh mục",
      module: "Danh mục",
      target: existing.name,
      description: `Đã cập nhật danh mục #${id}`,
      level: "warning",
      ip: context.ip,
      device: context.device,
      metadata: {
        categoryId: Number(id),
        before: {
          name: existing.name,
          image: existing.image,
          status: existing.status,
        },
        after: {
          name: updateData.name ?? existing.name,
          image: updateData.image ?? existing.image,
          status: updateData.status ?? existing.status,
        },
      },
    });

    return { success: true, message: "Cập nhật thành công!" };
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || "Lỗi hệ thống khi cập nhật",
    });
  }
});
