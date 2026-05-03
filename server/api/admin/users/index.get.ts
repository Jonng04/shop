import { desc } from "drizzle-orm";
import type { User } from "#auth-utils";

import { db } from "../../../database";
import { users } from "../../../database/schema";
import {
  requireAdminAccess,
  hasAnyAdminPermission,
  type AdminSessionUser,
} from "../../../utils/admin-permissions";

interface AdminUser extends User, AdminSessionUser {}

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event);
  const user = session.user as AdminUser;

  requireAdminAccess(user);

  const allowed = await hasAnyAdminPermission(user, ["view_users", "edit_users"]);

  if (!allowed) {
    throw createError({
      statusCode: 403,
      message: "Bạn không có quyền truy cập danh sách người dùng",
    });
  }

  try {
    const allUsers = await db.query.users.findMany({
      orderBy: [desc(users.id)],
    });

    const list = allUsers.map((u) => {
      const { password, ...rest } = u;
      return rest;
    });

    const total = list.length;
    const banned = list.filter((u) => u.status === "banned").length;
    const totalBalance = list.reduce((sum, u) => sum + (u.balance || 0), 0);

    const oneDayAgo = new Date();
    oneDayAgo.setHours(oneDayAgo.getHours() - 24);
    const newToday = list.filter(
      (u) => u.createdAt && new Date(u.createdAt) >= oneDayAgo,
    ).length;

    return {
      users: list,
      stats: {
        total,
        newToday,
        totalBalance,
        banned,
      },
    };
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      message: error?.message || "Có lỗi xảy ra khi lấy danh sách người dùng",
    });
  }
});
