import { db } from "../../../database";
import { plans, products } from "../../../database/schema";
import { eq, desc } from "drizzle-orm";
import type { User } from "#auth-utils";
import {
  hasAnyAdminPermission,
  requireAdminAccess,
  type AdminSessionUser,
} from "../../../utils/admin-permissions";

interface AdminUser extends User, AdminSessionUser {}

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event);
  const user = session.user as AdminUser;
  requireAdminAccess(user);

  const allowed = await hasAnyAdminPermission(user, [
    "view_plans",
    "manage_plans",
  ]);

  if (!allowed) {
    throw createError({
      statusCode: 403,
      message: "Bạn không có quyền xem gói sản phẩm",
    });
  }

  const query = getQuery(event);
  const productId = query.productId ? Number(query.productId) : null;

  try {
    const q = db
      .select({
        id: plans.id,
        productId: plans.productId,
        productName: products.name,
        name: plans.name,
        image: plans.image,
        price: plans.price,
        durationValue: plans.durationValue,
        durationType: plans.durationType,
        deliveryType: plans.deliveryType,
        status: plans.status,
        createdAt: plans.createdAt,
        fields: plans.fields,
      })
      .from(plans)
      .leftJoin(products, eq(plans.productId, products.id))
      .orderBy(desc(plans.createdAt));

    const results = productId
      ? await q.where(eq(plans.productId, productId))
      : await q;

    return results;
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      message: "Lỗi hệ thống khi lấy danh sách gói",
    });
  }
});
