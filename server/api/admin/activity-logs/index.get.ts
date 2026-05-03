import { and, desc, eq, like, or } from "drizzle-orm";
import type { User } from "#auth-utils";

import { db } from "../../../database";
import { activityLogs } from "../../../database/schema";
import {
  requireAdminPermission,
  type AdminSessionUser,
} from "../../../utils/admin-permissions";

interface AdminUser extends User, AdminSessionUser {
  id?: number;
}

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event);
  const user = session.user as AdminUser;

  await requireAdminPermission(user, "view_logs");

  const query = getQuery(event);
  const q = String(query.q || "").trim();
  const level = String(query.level || "all").trim();
  const moduleName = String(query.module || "all").trim();
  const actorRole = String(query.actorRole || "all").trim();

  try {
    const conditions = [];

    if (q) {
      const keyword = `%${q}%`;
      conditions.push(
        or(
          like(activityLogs.actorName, keyword),
          like(activityLogs.actorEmail, keyword),
          like(activityLogs.action, keyword),
          like(activityLogs.module, keyword),
          like(activityLogs.target, keyword),
          like(activityLogs.description, keyword),
        ),
      );
    }

    if (level !== "all") {
      conditions.push(eq(activityLogs.level, level));
    }

    if (moduleName !== "all") {
      conditions.push(eq(activityLogs.module, moduleName));
    }

    if (actorRole !== "all") {
      conditions.push(eq(activityLogs.actorRole, actorRole));
    }

    const rows = await db
      .select()
      .from(activityLogs)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(activityLogs.id));

    const logs = rows.map((row) => ({
      ...row,
      metadata: row.metadata ? safeJsonParse(row.metadata) : {},
    }));

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const stats = {
      total: logs.length,
      critical: logs.filter((item) => item.level === "critical").length,
      warnings: logs.filter((item) => item.level === "warning").length,
      today: logs.filter((item) => {
        if (!item.createdAt) return false;
        return new Date(item.createdAt) >= today;
      }).length,
    };

    return { logs, stats };
  } catch {
    throw createError({
      statusCode: 500,
      message: "Có lỗi xảy ra khi lấy nhật ký hệ thống",
    });
  }
});

const safeJsonParse = (value: string) => {
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
};
