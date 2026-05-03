import { db } from "../../../database";
import { categories } from "../../../database/schema";
import { desc } from "drizzle-orm";
import type { User } from "#auth-utils";
import {
  hasAnyAdminPermission,
  requireAdminAccess,
  type AdminSessionUser,
} from "../../../utils/admin-permissions";


interface AdminUser extends User, AdminSessionUser {
}

export default defineEventHandler(async (event) => {
  // 1. Kiểm tra quyền Admin
  const session = await getUserSession(event);
  const user = session.user as AdminUser;
  requireAdminAccess(user);

  const allowed = await hasAnyAdminPermission(user, ["view_categories", "manage_categories"]);

  if (!allowed) {
    throw createError({
      statusCode: 403,
      message: "Bạn không có quyền xem danh mục",
    });
  }

  try {
    // 2. Lấy danh sách danh mục
    const list = await db.query.categories.findMany({
      orderBy: [desc(categories.id)],
    });

    return list;
  } catch (error: any) {
    throw createError({ statusCode: 500, message: "Lỗi hệ thống khi lấy danh mục" });
  }
});
