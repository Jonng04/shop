import { eq } from "drizzle-orm";
import type { User } from "#auth-utils";

import { db } from "../../../database";
import { settings } from "../../../database/schema";
import { SECRET_MASK, isSecretSettingKey } from "../../../utils/admin-settings";
import { createActivityLog, getRequestContextMeta } from "../../../utils/activity-log";
import {
  requireAdminPermission,
  type AdminSessionUser,
} from "../../../utils/admin-permissions";

interface AdminUser extends User, AdminSessionUser {
  id?: number;
  role: string;
  username?: string;
  email?: string;
  name?: string;
}

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event);
  const user = session.user as AdminUser;

  await requireAdminPermission(user, "manage_settings");

  const body = await readBody(event);
  if (!body || typeof body !== "object") {
    throw createError({ statusCode: 400, message: "Dữ liệu không hợp lệ" });
  }

  try {
    const changedEntries: Array<{
      key: string;
      before: string | null;
      after: string | null;
    }> = [];

    for (const [key, value] of Object.entries(body)) {
      const existing = await db
        .select()
        .from(settings)
        .where(eq(settings.key, key))
        .limit(1);
      const previousValue = existing[0]?.value ?? null;
      const incomingValue =
        value === null || value === undefined ? null : String(value);
      const strValue =
        isSecretSettingKey(key) &&
        previousValue &&
        (incomingValue === SECRET_MASK || incomingValue === "")
          ? previousValue
          : incomingValue;

      if (existing.length > 0) {
        await db.update(settings).set({ value: strValue }).where(eq(settings.key, key));
      } else {
        await db.insert(settings).values({ key, value: strValue });
      }

      if (previousValue !== strValue) {
        changedEntries.push({
          key,
          before: previousValue,
          after: strValue,
        });
      }
    }

    if (changedEntries.length > 0) {
      const context = getRequestContextMeta(event);

      await createActivityLog({
        actorUserId: Number(user.id || 0) || null,
        actorName: user.username || user.name || "Admin",
        actorEmail: user.email || null,
        actorRole: String(user.role || "admin"),
        action: "Cập nhật cài đặt hệ thống",
        module: "Hệ thống",
        target: "General Settings",
        description: `Đã cập nhật ${changedEntries.length} cấu hình hệ thống`,
        level: "warning",
        ip: context.ip,
        device: context.device,
        metadata: {
          changedKeys: changedEntries.map((item) => item.key).join(", "),
          changes: changedEntries.slice(0, 10),
        },
      });
    }

    return { success: true, count: Object.keys(body).length };
  } catch (error: any) {
    throw createError({ statusCode: 500, message: "Lỗi khi lưu cài đặt: " + error.message });
  }
});
