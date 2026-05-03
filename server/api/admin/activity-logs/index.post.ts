import type { User } from "#auth-utils";

import { createActivityLog, getRequestContextMeta } from "../../../utils/activity-log";
import {
  requireAdminPermission,
  type AdminSessionUser,
} from "../../../utils/admin-permissions";

interface AdminUser extends User, AdminSessionUser {
  id?: number;
  username?: string;
  email?: string;
}

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event);
  const adminUser = session.user as AdminUser;

  await requireAdminPermission(adminUser, "view_logs");

  const body = await readBody(event);

  if (!body?.action || !body?.module || !body?.target) {
    throw createError({
      statusCode: 400,
      message: "Thiếu action, module hoặc target",
    });
  }

  try {
    const context = getRequestContextMeta(event);

    const inserted = await createActivityLog({
      actorUserId: Number(adminUser.id || 0) || null,
      actorName: body.actorName || adminUser.username || "Admin",
      actorEmail: body.actorEmail || adminUser.email || null,
      actorRole: body.actorRole || "admin",
      action: String(body.action),
      module: String(body.module),
      target: String(body.target),
      description: body.description ? String(body.description) : null,
      level: body.level ? String(body.level) : "info",
      ip: body.ip || context.ip,
      device: body.device || context.device,
      metadata:
        body.metadata && typeof body.metadata === "object" ? body.metadata : {},
    });

    return {
      success: true,
      id: inserted?.id || null,
      message: "Đã ghi nhật ký hệ thống",
    };
  } catch {
    throw createError({
      statusCode: 500,
      message: "Không thể ghi nhật ký hệ thống",
    });
  }
});
