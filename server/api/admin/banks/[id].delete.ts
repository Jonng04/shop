import { eq } from "drizzle-orm";
import type { User } from "#auth-utils";

import { db } from "../../../database";
import { banks } from "../../../database/schema";
import {
  createActivityLog,
  getRequestContextMeta,
} from "../../../utils/activity-log";
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

  await requireAdminPermission(user, "manage_banks");

  const id = Number(getRouterParam(event, "id"));
  if (!Number.isFinite(id) || id <= 0) {
    throw createError({ statusCode: 400, message: "ID ngân hàng không hợp lệ" });
  }

  try {
    const existing = await db.query.banks.findFirst({
      where: eq(banks.id, id),
    });

    if (!existing) {
      throw createError({
        statusCode: 404,
        message: "Ngân hàng không tồn tại",
      });
    }

    await db.delete(banks).where(eq(banks.id, id));

    const context = getRequestContextMeta(event);
    await createActivityLog({
      actorUserId: Number(user.id || 0) || null,
      actorName: user.username || user.name || "Admin",
      actorEmail: user.email || null,
      actorRole: "admin",
      action: "Xóa ngân hàng nhận tiền",
      module: "Nạp tiền",
      target: `${existing.bankName} - ${existing.accountNumber}`,
      description: `Đã xóa ngân hàng #${id}`,
      level: "critical",
      ip: context.ip,
      device: context.device,
      metadata: {
        bankId: id,
        deleted: existing,
      },
    });

    return { success: true, message: "Đã xóa ngân hàng" };
  } catch (error: any) {
    if (error?.statusCode) throw error;
    throw createError({
      statusCode: 500,
      message: error?.message || "Không thể xóa ngân hàng",
    });
  }
});
