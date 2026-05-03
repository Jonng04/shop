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

/** Chuyển chuỗi thành slug URL-safe */
function makeSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event);
  const user = session.user as AdminUser;
  await requireAdminPermission(user, "manage_plans");

  const body = await readBody(event);
  const {
    productId,
    name,
    slug: rawSlug,
    price,
    image,
    durationValue,
    durationType,
    status,
    description,
    deliveryType,
  } = body;

  if (!productId || !name || price === undefined) {
    throw createError({
      statusCode: 400,
      message: "Thiếu thông tin gói sản phẩm",
    });
  }

  // Tạo base slug từ input hoặc từ tên
  const baseSlug = makeSlug(rawSlug || name);

  // Đảm bảo slug unique (thêm suffix số nếu trùng)
  let finalSlug = baseSlug;
  let suffix = 1;
  while (true) {
    const conflict = await db
      .select({ id: plans.id })
      .from(plans)
      .where(eq(plans.slug, finalSlug))
      .limit(1);
    if (conflict.length === 0) break;
    finalSlug = `${baseSlug}-${suffix++}`;
  }

  try {
    const result = await db
      .insert(plans)
      .values({
        productId: Number(productId),
        name,
        slug: finalSlug,
        price: Number(price),
        image,
        durationValue: durationValue ? Number(durationValue) : null,
        durationType,
        status: status || "active",
        description,
        deliveryType: deliveryType || "manual",
      })
      .$returningId();

    await bumpCatalogCacheVersion();

    const context = getRequestContextMeta(event);
    await createActivityLog({
      actorUserId: Number(user.id || 0) || null,
      actorName: user.username || user.name || "Admin",
      actorEmail: user.email || null,
      actorRole: "admin",
      action: "Tạo gói sản phẩm",
      module: "Gói sản phẩm",
      target: name,
      description: `Đã tạo gói sản phẩm mới: ${name} (slug: ${finalSlug})`,
      level: "success",
      ip: context.ip,
      device: context.device,
      metadata: {
        planId: result?.[0]?.id || null,
        productId: Number(productId),
        price: Number(price),
        slug: finalSlug,
        status: status || "active",
      },
    });

    return { success: true, id: result?.[0]?.id || null, slug: finalSlug };
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      message: "Lỗi khi tạo gói sản phẩm: " + error.message,
    });
  }
});
