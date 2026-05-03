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

const VALID_STATUSES = ["active", "expired", "released"] as const;
const VALID_TYPES = ["manual", "auto"] as const;

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event);
  const user = session.user as AdminUser;

  await requireAdminPermission(user, "manage_block_ips");

  const id = Number(getRouterParam(event, "id"));
  if (!Number.isFinite(id) || id <= 0) {
    throw createError({ statusCode: 400, message: "ID block IP không hợp lệ" });
  }

  const body = await readBody(event);

  try {
    const existing = await db.query.blockIps.findFirst({
      where: eq(blockIps.id, id),
    });

    if (!existing) {
      throw createError({ statusCode: 404, message: "Bản ghi block IP không tồn tại" });
    }

    const updateData: Partial<typeof blockIps.$inferInsert> = {};

    if (body.status !== undefined) {
      const status = String(body.status).trim();
      if (!VALID_STATUSES.includes(status as (typeof VALID_STATUSES)[number])) {
        throw createError({ statusCode: 400, message: "Trạng thái không hợp lệ" });
      }
      updateData.status = status;
    }

    if (body.reason !== undefined) {
      const reason = String(body.reason).trim();
      if (!reason) {
        throw createError({ statusCode: 400, message: "Lý do không được để trống" });
      }
      updateData.reason = reason;
    }

    if (body.country !== undefined) {
      updateData.country = String(body.country || "VN").trim().toUpperCase() || "VN";
    }

    if (body.username !== undefined) {
      updateData.username = body.username ? String(body.username).trim() : null;
    }

    if (body.hitCount !== undefined) {
      const hitCount = Number(body.hitCount);
      if (!Number.isFinite(hitCount) || hitCount < 0) {
        throw createError({ statusCode: 400, message: "Hit count không hợp lệ" });
      }
      updateData.hitCount = hitCount;
    }

    if (body.blockType !== undefined) {
      const blockType = String(body.blockType).trim();
      if (!VALID_TYPES.includes(blockType as (typeof VALID_TYPES)[number])) {
        throw createError({ statusCode: 400, message: "Loại block không hợp lệ" });
      }
      updateData.blockType = blockType;
    }

    if (body.expiresAt !== undefined) {
      if (!body.expiresAt) {
        updateData.expiresAt = null;
      } else {
        const expiresAt = new Date(body.expiresAt);
        if (Number.isNaN(expiresAt.getTime())) {
          throw createError({ statusCode: 400, message: "Thời gian hết hạn không hợp lệ" });
        }
        updateData.expiresAt = expiresAt;
      }
    }

    if (body.lastSeenAt !== undefined) {
      const lastSeenAt = new Date(body.lastSeenAt);
      if (Number.isNaN(lastSeenAt.getTime())) {
        throw createError({ statusCode: 400, message: "Thời gian truy cập cuối không hợp lệ" });
      }
      updateData.lastSeenAt = lastSeenAt;
    }

    if (Object.keys(updateData).length === 0) {
      throw createError({ statusCode: 400, message: "Không có dữ liệu để cập nhật" });
    }

    await db.update(blockIps).set(updateData).where(eq(blockIps.id, id));

    const context = getRequestContextMeta(event);
    await createActivityLog({
      actorUserId: Number(user.id || 0) || null,
      actorName: user.username || user.name || "Admin",
      actorEmail: user.email || null,
      actorRole: "admin",
      action:
        updateData.status === "released"
          ? "Mở chặn IP"
          : "Cập nhật block IP",
      module: "Bảo mật",
      target: existing.ip,
      description:
        updateData.status === "released"
          ? `Đã mở chặn IP ${existing.ip}`
          : `Đã cập nhật bản ghi block IP #${id}`,
      level: updateData.status === "released" ? "success" : "warning",
      ip: context.ip,
      device: context.device,
      metadata: {
        blockIpId: id,
        before: existing,
        after: {
          ...existing,
          ...updateData,
        },
      },
    });

    return { success: true, message: "Đã cập nhật bản ghi block IP" };
  } catch (error: any) {
    if (error?.statusCode) {
      throw error;
    }

    throw createError({
      statusCode: 500,
      message: "Không thể cập nhật bản ghi block IP",
    });
  }
});
