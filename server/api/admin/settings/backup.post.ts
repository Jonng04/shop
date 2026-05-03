import type { User } from "#auth-utils";

import { createDatabaseBackup } from "../../../utils/database-backup";
import {
  requireAdminPermission,
  type AdminSessionUser,
} from "../../../utils/admin-permissions";

interface AdminUser extends User, AdminSessionUser {}

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event);
  const user = session.user as AdminUser;

  await requireAdminPermission(user, "manage_settings");

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw createError({
      statusCode: 500,
      message: "Thiếu cấu hình DATABASE_URL",
    });
  }

  try {
    const result = await createDatabaseBackup({ databaseUrl });

    return {
      success: true,
      filename: result.filename,
      url: result.url,
    };
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      message: error?.message || "Không thể tạo backup database",
    });
  }
});
