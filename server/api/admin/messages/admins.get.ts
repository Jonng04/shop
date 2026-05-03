import { desc, ne } from "drizzle-orm";

import { db } from "../../../database";
import { users } from "../../../database/schema";
import {
  ADMIN_PERMISSION_ALL,
  getAdminPermissionsByRoleName,
} from "../../../utils/admin-permissions";
import {
  requireSupportManagePermission,
  type SupportAdminUser,
} from "../../../utils/support-chat";

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event);
  const user = session.user as SupportAdminUser;

  await requireSupportManagePermission(user);

  try {
    const rows = await db
      .select({
        id: users.id,
        username: users.username,
        email: users.email,
        role: users.role,
        status: users.status,
      })
      .from(users)
      .where(ne(users.role, "user"))
      .orderBy(desc(users.id));

    const permissionChecks = await Promise.all(
      rows.map(async (item) => {
        const permissions = await getAdminPermissionsByRoleName(item.role);
        const canManageMessages =
          permissions.includes(ADMIN_PERMISSION_ALL) ||
          permissions.includes("manage_messages");

        return {
          ...item,
          canManageMessages,
        };
      }),
    );

    return {
      items: permissionChecks
        .filter((item) => item.canManageMessages)
        .map(({ canManageMessages, ...item }) => item),
    };
  } catch (error: any) {
    throw createError({
      statusCode: error?.statusCode || 500,
      message: error?.message || "Không thể lấy danh sách admin hỗ trợ",
    });
  }
});
