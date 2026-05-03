import { db } from "../../../database";
import { plans } from "../../../database/schema";
import { eq, and, ne } from "drizzle-orm";
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

  const id = getRouterParam(event, "id");
  if (!id) throw createError({ statusCode: 400, message: "Thiếu ID" });

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
    fields,
  } = body;

  try {
    const planExist = await db
      .select()
      .from(plans)
      .where(eq(plans.id, Number(id)))
      .limit(1);

    if (planExist.length === 0) {
      throw createError({ statusCode: 404, message: "Gói không tồn tại" });
    }

    const existing = planExist[0]!;

    // Xử lý slug nếu được gửi lên
    let newSlug: string | undefined = undefined;
    if (rawSlug !== undefined) {
      const cleanSlug = makeSlug(rawSlug || existing.name);
      // Kiểm tra unique (bỏ qua chính gói này)
      const conflict = await db
        .select({ id: plans.id })
        .from(plans)
        .where(and(eq(plans.slug, cleanSlug), ne(plans.id, Number(id))))
        .limit(1);
      if (conflict.length > 0) {
        throw createError({
          statusCode: 409,
          message: `Slug "${cleanSlug}" đã được dùng bởi gói khác`,
        });
      }
      newSlug = cleanSlug;
    }

    await db
      .update(plans)
      .set({
        productId: productId ? Number(productId) : undefined,
        name: name || undefined,
        slug: newSlug,
        price: price !== undefined ? Number(price) : undefined,
        image: image !== undefined ? image : undefined,
        durationValue:
          durationValue !== undefined
            ? durationValue
              ? Number(durationValue)
              : null
            : undefined,
        durationType: durationType !== undefined ? durationType : undefined,
        status: status || undefined,
        description: description !== undefined ? description : undefined,
        deliveryType: deliveryType !== undefined ? deliveryType : undefined,
        fields:
          fields !== undefined
            ? typeof fields === "string"
              ? fields
              : JSON.stringify(fields)
            : undefined,
      })
      .where(eq(plans.id, Number(id)));

    await bumpCatalogCacheVersion();

    const context = getRequestContextMeta(event);
    await createActivityLog({
      actorUserId: Number(user.id || 0) || null,
      actorName: user.username || user.name || "Admin",
      actorEmail: user.email || null,
      actorRole: "admin",
      action: "Cập nhật gói sản phẩm",
      module: "Gói sản phẩm",
      target: existing.name,
      description: `Đã cập nhật gói sản phẩm #${id}`,
      level: "warning",
      ip: context.ip,
      device: context.device,
      metadata: {
        planId: Number(id),
        before: {
          name: existing.name,
          price: existing.price,
          slug: existing.slug,
        },
        after: {
          name: name || existing.name,
          price: price !== undefined ? Number(price) : existing.price,
          slug: newSlug ?? existing.slug,
        },
      },
    });

    return { success: true, message: "Cập nhật thành công" };
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || "Lỗi cập nhật gói",
    });
  }
});
