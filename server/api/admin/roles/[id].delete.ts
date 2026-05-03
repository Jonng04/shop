import { eq } from "drizzle-orm";
import type { User } from "#auth-utils";

import { db } from "../../../database";
import { adminRoles, users } from "../../../database/schema";
import {
  requireAdminPermission,
  type AdminSessionUser,
} from "../../../utils/admin-permissions";
import {
  createActivityLog,
  getRequestContextMeta,
} from "../../../utils/activity-log";

interface AdminUser extends User, AdminSessionUser {
  username?: string;
  name?: string;
}

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event);
  const user = session.user as AdminUser;

  await requireAdminPermission(user, "manage_roles");

  const id = Number(getRouterParam(event, "id"));
  if (!Number.isFinite(id) || id <= 0) {
    throw createError({ statusCode: 400, message: "ID vai trò không hợp lệ" });
  }

  try {
    const [roleRecord] = await db
      .select()
      .from(adminRoles)
      .where(eq(adminRoles.id, id))
      .limit(1);

    if (!roleRecord) {
      throw createError({
        statusCode: 404,
        message: "Không tìm thấy vai trò admin",
      });
    }

    const relatedUsers = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.role, roleRecord.name))
      .limit(1);

    if (relatedUsers.length > 0) {
      throw createError({
        statusCode: 400,
        message: "Vai trò này đang được gán cho tài khoản admin khác",
      });
    }

    await db.delete(adminRoles).where(eq(adminRoles.id, id));

    const context = getRequestContextMeta(event);
    await createActivityLog({
      actorUserId: Number(user.id || 0) || null,
      actorName: user.username || user.name || "Admin",
      actorEmail: user.email || null,
      actorRole: "admin",
      action: "Xóa vai trò admin",
      module: "Phân quyền",
      target: roleRecord.name,
      description: `Đã xóa vai trò ${roleRecord.name}`,
      level: "warning",
      ip: context.ip,
      device: context.device,
      metadata: {
        roleId: id,
        name: roleRecord.name,
      },
    });

    return {
      success: true,
      message: "Đã xóa vai trò admin",
    };
  } catch (error: any) {
    if (error?.statusCode) {
      throw error;
    }

    throw createError({
      statusCode: 500,
      message: error?.message || "Không thể xóa vai trò admin",
    });
  }
});
