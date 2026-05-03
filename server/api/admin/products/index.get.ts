import { db } from "../../../database";
import { products, categories, plans } from "../../../database/schema";
import { eq, desc, count } from "drizzle-orm";
import type { User } from "#auth-utils";
import {
  hasAnyAdminPermission,
  requireAdminAccess,
  type AdminSessionUser,
} from "../../../utils/admin-permissions";

interface AdminUser extends User, AdminSessionUser {}

export default defineEventHandler(async (event) => {
  // 1. Check Admin Permission
  const session = await getUserSession(event);
  const user = session.user as AdminUser;
  requireAdminAccess(user);

  const allowed = await hasAnyAdminPermission(user, [
    "view_products",
    "manage_products",
  ]);

  if (!allowed) {
    throw createError({
      statusCode: 403,
      message: "Bạn không có quyền xem sản phẩm",
    });
  }

  try {
    // 2. Fetch products with category details
    const list = await db
      .select({
        id: products.id,
        name: products.name,
        image: products.image,
        status: products.status,
        createdAt: products.createdAt,
        categoryName: categories.name,
        categoryId: products.categoryId,
        planCount: count(plans.id),
      })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .leftJoin(plans, eq(plans.productId, products.id))
      .groupBy(products.id)
      .orderBy(desc(products.id));

    return list.map((p) => ({ ...p, planCount: Number(p.planCount) }));
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      message: "Lỗi hệ thống khi lấy danh sách sản phẩm",
    });
  }
});
