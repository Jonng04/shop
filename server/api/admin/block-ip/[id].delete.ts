import { eq } from "drizzle-orm";
import type { User } from "#auth-utils";

import { db } from "../../../database";
import { blockIps } from "../../../database/schema";
import { createActivityLog, getRequestContextMeta } from "../../../utils/activity-log";
import {
  requireAdminPermission,
  type AdminSessionUser,
} from "../../../utils/admin-permissions";

interface AdminUser extends User, AdminSessionUser {
  id?: number;
  username?: string;
  email?: string;
  name?: string;
}

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event);
  const user = session.user as AdminUser;

  await requireAdminPermission(user, "manage_block_ips");

  const id = Number(getRouterParam(event, "id"));
  if (!Number.isFinite(id) || id <= 0) {
    throw createError({ statusCode: 400, message: "ID block IP không hợp lệ" });
  }

  try {
    const existing = await db.query.blockIps.findFirst({
      where: eq(blockIps.id, id),
    });

    if (!existing) {
      throw createError({ statusCode: 404, message: "Bản ghi block IP không tồn tại" });
    }

    await db.delete(blockIps).where(eq(blockIps.id, id));

    const context = getRequestContextMeta(event);
    await createActivityLog({
      actorUserId: Number(user.id || 0) || null,
      actorName: user.username || user.name || "Admin",
      actorEmail: user.email || null,
      actorRole: "admin",
      action: "Xóa block IP",
      module: "Bảo mật",
      target: existing.ip,
      description: `Đã xóa bản ghi block IP #${id}`,
      level: "critical",
      ip: context.ip,
      device: context.device,
      metadata: {
        blockIpId: id,
        deleted: existing,
      },
    });

    return { success: true, message: "Đã xóa bản ghi block IP" };
  } catch (error: any) {
    if (error?.statusCode) {
      throw error;
    }

    throw createError({
      statusCode: 500,
      message: "Không thể xóa bản ghi block IP",
    });
  }
});
