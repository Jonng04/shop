import type { User } from "#auth-utils";

import { db } from "../../../database";
import { settings } from "../../../database/schema";
import { maskSettingValue } from "../../../utils/admin-settings";
import {
  requireAdminPermission,
  type AdminSessionUser,
} from "../../../utils/admin-permissions";

interface AdminUser extends User, AdminSessionUser {}

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event);
  const user = session.user as AdminUser;

  await requireAdminPermission(user, "manage_settings");

  try {
    const rows = await db.select().from(settings);
    const result: Record<string, string | null> = {};
    for (const row of rows) {
      result[row.key] = maskSettingValue(row.key, row.value);
    }
    return result;
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      message: "Lỗi khi lấy cài đặt: " + error.message,
    });
  }
});
