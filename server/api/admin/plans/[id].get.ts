import { db } from "../../../database";
import { plans, products } from "../../../database/schema";
import { eq } from "drizzle-orm";
import type { User } from "#auth-utils";
import {
  hasAnyAdminPermission,
  requireAdminAccess,
  type AdminSessionUser,
} from "../../../utils/admin-permissions";


interface AdminUser extends User, AdminSessionUser {
}

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event);
  const user = session.user as AdminUser;
  requireAdminAccess(user);

  const allowed = await hasAnyAdminPermission(user, ["view_plans", "manage_plans"]);

  if (!allowed) {
    throw createError({
      statusCode: 403,
      message: "Bạn không có quyền xem gói sản phẩm",
    });
  }

  const id = getRouterParam(event, "id");
  if (!id) throw createError({ statusCode: 400, message: "Thiếu ID" });

  const record = await db
    .select({
      plan: plans,
      product: products,
    })
    .from(plans)
    .leftJoin(products, eq(plans.productId, products.id))
    .where(eq(plans.id, Number(id)))
    .limit(1);

  if (!record || record.length === 0 || !record[0]) {
    throw createError({ statusCode: 404, message: "Không tìm thấy gói sản phẩm" });
  }

  const { plan: planData, product: productData } = record[0];
  return {
    ...planData,
    productName: productData?.name || "N/A",
  };
});
