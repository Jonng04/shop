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

  const body = await readBody(event);
  const bankName = String(body.bankName || "").trim();
  const bankCode = String(body.bankCode || "").trim().toUpperCase() || null;
  const accountNumber = String(body.accountNumber || "").trim();
  const accountName = String(body.accountName || "").trim();
  const status = String(body.status || "active").trim();

  if (bankName.length < 2) {
    throw createError({
      statusCode: 400,
      message: "Tên ngân hàng phải có ít nhất 2 ký tự",
    });
  }

  if (!accountNumber) {
    throw createError({
      statusCode: 400,
      message: "Số tài khoản là bắt buộc",
    });
  }

  if (accountName.length < 2) {
    throw createError({
      statusCode: 400,
      message: "Tên chủ tài khoản phải có ít nhất 2 ký tự",
    });
  }

  if (!["active", "inactive"].includes(status)) {
    throw createError({
      statusCode: 400,
      message: "Trạng thái ngân hàng không hợp lệ",
    });
  }

  try {
    const inserted = await db
      .insert(banks)
      .values({
        bankName,
        bankCode,
        accountNumber,
        accountName,
        status,
      })
      .$returningId();

    const context = getRequestContextMeta(event);
    await createActivityLog({
      actorUserId: Number(user.id || 0) || null,
      actorName: user.username || user.name || "Admin",
      actorEmail: user.email || null,
      actorRole: "admin",
      action: "Thêm ngân hàng nhận tiền",
      module: "Nạp tiền",
      target: `${bankName} - ${accountNumber}`,
      description: `Đã thêm ngân hàng ${bankName}`,
      level: "success",
      ip: context.ip,
      device: context.device,
      metadata: {
        bankId: inserted?.[0]?.id || null,
        bankName,
        bankCode,
        accountNumber,
        accountName,
        status,
      },
    });

    return { success: true, message: "Đã thêm ngân hàng mới" };
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      message: error?.message || "Không thể thêm ngân hàng",
    });
  }
});
