import { eq } from "drizzle-orm";
import type { User } from "#auth-utils";

import { db } from "../../../database";
import { adminRoles } from "../../../database/schema";
import {
  parseAdminPermissions,
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

  const body = await readBody(event);
  const name = String(body.name || "").trim();
  const roleInput = String(body.role || "").trim();
  const normalizedRole = parseAdminPermissions(roleInput).join(",");

  if (name.length < 2) {
    throw createError({
      statusCode: 400,
      message: "Tên vai trò phải có ít nhất 2 ký tự",
    });
  }

  try {
    await db
      .update(adminRoles)
      .set({
        name,
        role: normalizedRole || null,
      })
      .where(eq(adminRoles.id, id));

    const context = getRequestContextMeta(event);
    await createActivityLog({
      actorUserId: Number(user.id || 0) || null,
      actorName: user.username || user.name || "Admin",
      actorEmail: user.email || null,
      actorRole: "admin",
      action: "Cập nhật vai trò admin",
      module: "Phân quyền",
      target: name,
      description: `Đã cập nhật vai trò ${name}`,
      level: "info",
      ip: context.ip,
      device: context.device,
      metadata: {
        roleId: id,
        name,
        role: normalizedRole,
      },
    });

    return {
      success: true,
      message: "Đã cập nhật vai trò admin",
    };
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      message: error?.message || "Không thể cập nhật vai trò admin",
    });
  }
});

