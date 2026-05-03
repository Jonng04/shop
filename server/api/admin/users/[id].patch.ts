import bcrypt from "bcrypt";
import { eq } from "drizzle-orm";
import type { User } from "#auth-utils";

import { db } from "../../../database";
import { adminRoles, users } from "../../../database/schema";
import { createActivityLog, getRequestContextMeta } from "../../../utils/activity-log";
import {
  requireAdminPermission,
  type AdminSessionUser,
} from "../../../utils/admin-permissions";

interface AdminUser extends User, AdminSessionUser {
  username?: string;
  email?: string;
  name?: string;
}

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event);
  const adminUser = session.user as AdminUser;

  await requireAdminPermission(adminUser, "edit_users");

  const id = getRouterParam(event, "id");
  const body = await readBody(event);
  if (!id) {
    throw createError({ statusCode: 400, message: "Thiếu ID" });
  }

  try {
    const targetUser = await db.query.users.findFirst({
      where: eq(users.id, Number(id)),
    });

    if (!targetUser) {
      throw createError({ statusCode: 404, message: "Người dùng không tồn tại" });
    }

    const allowedFields = [
      "username",
      "email",
      "role",
      "balance",
      "totalBalance",
      "status",
    ] as const;
    const updateData: Record<string, unknown> = {};

    for (const key of allowedFields) {
      if (body[key] !== undefined) {
        updateData[key] = body[key];
      }
    }

    if (typeof updateData.role === "string") {
      const normalizedRole = updateData.role.trim();

      if (!normalizedRole) {
        throw createError({ statusCode: 400, message: "Vai trò không hợp lệ" });
      }

      if (normalizedRole !== "user") {
        const roleRecord = await db.query.adminRoles.findFirst({
          where: eq(adminRoles.name, normalizedRole),
        });

        if (!roleRecord && normalizedRole !== "admin") {
          throw createError({ statusCode: 400, message: "Vai trò admin không tồn tại" });
        }
      }

      updateData.role = normalizedRole;
    }

    if (body.password && body.password.trim() !== "") {
      if (body.password.length < 6) {
        throw createError({ statusCode: 400, message: "Mật khẩu phải từ 6 ký tự trở lên" });
      }
      updateData.password = await bcrypt.hash(body.password, 10);
    }

    if (Object.keys(updateData).length === 0) {
      return { success: true, message: "Không có thay đổi nào" };
    }

    await db.update(users).set(updateData).where(eq(users.id, Number(id)));

    const context = getRequestContextMeta(event);
    await createActivityLog({
      actorUserId: Number(adminUser.id || 0) || null,
      actorName: adminUser.username || adminUser.name || "Admin",
      actorEmail: adminUser.email || null,
      actorRole: String(adminUser.role || "admin"),
      action: "Cập nhật người dùng",
      module: "Khách hàng",
      target: targetUser.username,
      description: `Cập nhật user #${id}`,
      level: "warning",
      ip: context.ip,
      device: context.device,
      metadata: {
        userId: Number(id),
        username: targetUser.username,
        changedFields: Object.keys(updateData),
      },
    });

    return { success: true, message: "Cập nhật thành công" };
  } catch (error: any) {
    throw createError({
      statusCode: error?.statusCode || 500,
      message: error?.message || "Lỗi hệ thống khi cập nhật người dùng",
    });
  }
});
