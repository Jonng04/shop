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

const VALID_TYPES = ["manual", "auto"] as const;
const VALID_DURATIONS = ["24h", "7d", "permanent"] as const;

const durationToExpiresAt = (duration: string) => {
  if (duration === "permanent") return null;

  const now = new Date();
  const expiresAt = new Date(now);

  if (duration === "24h") {
    expiresAt.setHours(now.getHours() + 24);
  }

  if (duration === "7d") {
    expiresAt.setDate(now.getDate() + 7);
  }

  return expiresAt;
};

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event);
  const user = session.user as AdminUser;

  await requireAdminPermission(user, "manage_block_ips");

  const body = await readBody(event);
  const ip = String(body.ip || "").trim();
  const reason = String(body.reason || "").trim();
  const username = body.username ? String(body.username).trim() : null;
  const country = String(body.country || "VN").trim().toUpperCase();
  const blockType = String(body.blockType || "manual").trim();
  const duration = String(body.duration || "24h").trim();

  if (!ip) {
    throw createError({ statusCode: 400, message: "Địa chỉ IP là bắt buộc" });
  }

  if (!reason) {
    throw createError({ statusCode: 400, message: "Lý do chặn là bắt buộc" });
  }

  if (!VALID_TYPES.includes(blockType as (typeof VALID_TYPES)[number])) {
    throw createError({ statusCode: 400, message: "Loại block không hợp lệ" });
  }

  if (!VALID_DURATIONS.includes(duration as (typeof VALID_DURATIONS)[number])) {
    throw createError({ statusCode: 400, message: "Thời hạn block không hợp lệ" });
  }

  const blockedAt = new Date();
  const expiresAt = durationToExpiresAt(duration);

  try {
    const inserted = await db
      .insert(blockIps)
      .values({
        ip,
        username,
        country: country || "VN",
        reason,
        hitCount: 0,
        status: "active",
        blockType,
        blockedAt,
        expiresAt,
        lastSeenAt: blockedAt,
      })
      .$returningId();

    const context = getRequestContextMeta(event);
    await createActivityLog({
      actorUserId: Number(user.id || 0) || null,
      actorName: user.username || user.name || "Admin",
      actorEmail: user.email || null,
      actorRole: "admin",
      action: "Thêm IP chặn",
      module: "Bảo mật",
      target: ip,
      description: `Đã thêm IP ${ip} vào danh sách chặn`,
      level: "warning",
      ip: context.ip,
      device: context.device,
      metadata: {
        blockIpId: inserted?.[0]?.id || null,
        ip,
        username,
        country: country || "VN",
        reason,
        blockType,
        duration,
        expiresAt: expiresAt ? expiresAt.toISOString() : null,
      },
    });

    return {
      success: true,
      id: inserted?.[0]?.id || null,
      message: "Đã thêm IP vào danh sách chặn",
    };
  } catch {
    throw createError({
      statusCode: 500,
      message: "Không thể thêm IP vào danh sách chặn",
    });
  }
});
