import { desc } from "drizzle-orm";
import type { User } from "#auth-utils";

import { db } from "../../../database";
import { adminRoles } from "../../../database/schema";
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
    "view_roles",
    "manage_roles",
  ]);

  if (!allowed) {
    throw createError({
      statusCode: 403,
      message: "Bạn không có quyền xem vai trò admin",
    });
  }

  try {
    return await db.query.adminRoles.findMany({
      orderBy: [desc(adminRoles.id)],
    });
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      message: error?.message || "Không thể lấy danh sách vai trò admin",
    });
  }
});
