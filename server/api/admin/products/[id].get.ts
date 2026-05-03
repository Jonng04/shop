import { db } from "../../../database";
import { products } from "../../../database/schema";
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
  // 1. Check Admin Permission
  const session = await getUserSession(event);
  const user = session.user as AdminUser;
  requireAdminAccess(user);

  const allowed = await hasAnyAdminPermission(user, ["view_products", "manage_products"]);

  if (!allowed) {
    throw createError({
      statusCode: 403,
      message: "Bạn không có quyền xem sản phẩm",
    });
  }

  // 2. Get ID
  const id = getRouterParam(event, "id");
  if (!id) throw createError({ statusCode: 400, message: "Thiếu ID" });

  try {
    // 3. Find product
    const product = await db.query.products.findFirst({
      where: eq(products.id, Number(id)),
    });

    if (!product) {
      throw createError({ statusCode: 404, message: "Sản phẩm không tồn tại" });
    }

    return product;
  } catch (error: any) {
    throw createError({ statusCode: error.statusCode || 500, message: error.message || "Lỗi khi lấy chi tiết" });
  }
});
