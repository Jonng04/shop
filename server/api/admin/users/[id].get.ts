import { eq } from "drizzle-orm";
import type { User } from "#auth-utils";

import { db } from "../../../database";
import { users } from "../../../database/schema";
import {
  requireAdminAccess,
  hasAnyAdminPermission,
  type AdminSessionUser,
} from "../../../utils/admin-permissions";

interface AdminUser extends User, AdminSessionUser {}

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event);
  const adminUser = session.user as AdminUser;

  requireAdminAccess(adminUser);

  const allowed = await hasAnyAdminPermission(adminUser, ["view_users", "edit_users"]);

  if (!allowed) {
    throw createError({ statusCode: 403, message: "Bạn không có quyền xem người dùng" });
  }

  const id = getRouterParam(event, "id");
  if (!id) {
    throw createError({ statusCode: 400, message: "Thiếu user ID" });
  }

  try {
    const user = await db.query.users.findFirst({
      where: eq(users.id, Number(id)),
    });

    if (!user) {
      throw createError({
        statusCode: 404,
        message: "Người dùng không tồn tại",
      });
    }

    const { password, ...safeUser } = user;
    return {
      ...safeUser,
      balance: Number(user.balance || 0),
      totalBalance: Number(user.totalBalance || 0),
    };
  } catch (error: any) {
    throw createError({
      statusCode: error?.statusCode || 500,
      message: error?.message || "Lỗi hệ thống khi lấy chi tiết người dùng",
    });
  }
});
