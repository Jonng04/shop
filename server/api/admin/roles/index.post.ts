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
    const inserted = await db
      .insert(adminRoles)
      .values({
        name,
        role: normalizedRole || null,
      })
      .$returningId();

    const context = getRequestContextMeta(event);
    await createActivityLog({
      actorUserId: Number(user.id || 0) || null,
      actorName: user.username || user.name || "Admin",
      actorEmail: user.email || null,
      actorRole: "admin",
      action: "Thêm vai trò admin",
      module: "Phân quyền",
      target: name,
      description: `Đã tạo vai trò ${name}`,
      level: "success",
      ip: context.ip,
      device: context.device,
      metadata: {
        roleId: inserted?.[0]?.id || null,
        name,
        role: normalizedRole,
      },
    });

    return {
      success: true,
      message: "Đã thêm vai trò admin mới",
    };
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      message: error?.message || "Không thể thêm vai trò admin",
    });
  }
});

