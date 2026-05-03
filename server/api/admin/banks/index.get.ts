import { desc } from "drizzle-orm";
import type { User } from "#auth-utils";

import { db } from "../../../database";
import { banks } from "../../../database/schema";
import {
  requireAdminPermission,
  type AdminSessionUser,
} from "../../../utils/admin-permissions";

interface AdminUser extends User, AdminSessionUser {}

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event);
  const user = session.user as AdminUser;

  await requireAdminPermission(user, "manage_banks");

  try {
    return await db.query.banks.findMany({
      orderBy: [desc(banks.id)],
    });
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      message: error?.message || "Không thể lấy danh sách ngân hàng",
    });
  }
});
