import { db } from "../../../database";
import { categories } from "../../../database/schema";
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

  const body = await readBody(event);

  const name = String(body?.name || "").trim();
  const slug = normalizeOptionalString(body?.slug);
  const image = normalizeOptionalString(body?.image);
  const status = body?.status === "hidden" ? "hidden" : "active";

  if (!name || name.length < 2) {
    throw createError({
      statusCode: 400,
      message: "Tên danh mục phải có ít nhất 2 ký tự",
    });
  }

  try {
    const result = await db
      .insert(categories)
      .values({
        name,
        slug,
        image,
        status,
      })
      .$returningId();

    await bumpCatalogCacheVersion();

    const context = getRequestContextMeta(event);
    await createActivityLog({
      actorUserId: Number(user.id || 0) || null,
      actorName: user.username || user.name || "Admin",
      actorEmail: user.email || null,
      actorRole: "admin",
      action: "Tạo danh mục",
      module: "Danh mục",
      target: name,
      description: `Đã tạo danh mục mới: ${name}`,
      level: "success",
      ip: context.ip,
      device: context.device,
      metadata: {
        categoryId: result?.[0]?.id || null,
        name,
        status,
      },
    });

    return { success: true, message: "Đã thêm danh mục mới" };
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      message: "Lỗi hệ thống khi thêm danh mục",
    });
  }
});
