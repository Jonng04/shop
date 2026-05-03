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

  const body = await readBody(event);

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

    const updateData: Partial<typeof banks.$inferInsert> = {};

    if (body.bankName !== undefined) {
      const bankName = String(body.bankName || "").trim();
      if (bankName.length < 2) {
        throw createError({
          statusCode: 400,
          message: "Tên ngân hàng phải có ít nhất 2 ký tự",
        });
      }
      updateData.bankName = bankName;
    }

    if (body.bankCode !== undefined) {
      updateData.bankCode =
        String(body.bankCode || "").trim().toUpperCase() || null;
    }

    if (body.accountNumber !== undefined) {
      const accountNumber = String(body.accountNumber || "").trim();
      if (!accountNumber) {
        throw createError({
          statusCode: 400,
          message: "Số tài khoản là bắt buộc",
        });
      }
      updateData.accountNumber = accountNumber;
    }

    if (body.accountName !== undefined) {
      const accountName = String(body.accountName || "").trim();
      if (accountName.length < 2) {
        throw createError({
          statusCode: 400,
          message: "Tên chủ tài khoản phải có ít nhất 2 ký tự",
        });
      }
      updateData.accountName = accountName;
    }

    if (body.status !== undefined) {
      const status = String(body.status || "").trim();
      if (!["active", "inactive"].includes(status)) {
        throw createError({
          statusCode: 400,
          message: "Trạng thái ngân hàng không hợp lệ",
        });
      }
      updateData.status = status;
    }

    if (Object.keys(updateData).length === 0) {
      throw createError({
        statusCode: 400,
        message: "Không có dữ liệu để cập nhật",
      });
    }

    await db.update(banks).set(updateData).where(eq(banks.id, id));

    const context = getRequestContextMeta(event);
    await createActivityLog({
      actorUserId: Number(user.id || 0) || null,
      actorName: user.username || user.name || "Admin",
      actorEmail: user.email || null,
      actorRole: "admin",
      action: "Cập nhật ngân hàng nhận tiền",
      module: "Nạp tiền",
      target: `${existing.bankName} - ${existing.accountNumber}`,
      description: `Đã cập nhật ngân hàng #${id}`,
      level: "warning",
      ip: context.ip,
      device: context.device,
      metadata: {
        bankId: id,
        before: existing,
        after: { ...existing, ...updateData },
      },
    });

    return { success: true, message: "Đã cập nhật ngân hàng" };
  } catch (error: any) {
    if (error?.statusCode) throw error;
    throw createError({
      statusCode: 500,
      message: error?.message || "Không thể cập nhật ngân hàng",
    });
  }
});
