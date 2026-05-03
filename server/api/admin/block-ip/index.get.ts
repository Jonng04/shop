import { and, desc, eq, like, or, sql, type SQL } from "drizzle-orm";
import type { User } from "#auth-utils";

import { db } from "../../../database";
import { blockIps } from "../../../database/schema";
import {
  hasAnyAdminPermission,
  requireAdminAccess,
  type AdminSessionUser,
} from "../../../utils/admin-permissions";

interface AdminUser extends User, AdminSessionUser {}

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event);
  const user = session.user as AdminUser;

  requireAdminAccess(user);

  const allowed = await hasAnyAdminPermission(user, ["view_block_ips", "manage_block_ips"]);

  if (!allowed) {
    throw createError({
      statusCode: 403,
      message: "Bạn không có quyền truy cập danh sách chặn IP",
    });
  }

  const query = getQuery(event);
  const q = String(query.q || "").trim();
  const status = String(query.status || "all").trim();
  const blockType = String(query.blockType || "all").trim();

  try {
    const conditions: SQL[] = [];

    if (q) {
      const keyword = `%${q}%`;
      conditions.push(
        or(
          like(blockIps.ip, keyword),
          like(blockIps.username, keyword),
          like(blockIps.country, keyword),
          like(blockIps.reason, keyword),
        )!,
      );
    }

    if (status !== "all") {
      conditions.push(eq(blockIps.status, status));
    }

    if (blockType !== "all") {
      conditions.push(eq(blockIps.blockType, blockType));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const rows = await db
      .select()
      .from(blockIps)
      .where(whereClause)
      .orderBy(desc(blockIps.id));

    const [statsRow] = await db
      .select({
        total: sql<number>`count(*)`,
        active: sql<number>`sum(case when ${blockIps.status} = 'active' then 1 else 0 end)`,
        auto: sql<number>`sum(case when ${blockIps.blockType} = 'auto' then 1 else 0 end)`,
        today: sql<number>`sum(case when date(${blockIps.blockedAt}) = curdate() then 1 else 0 end)`,
      })
      .from(blockIps);

    return {
      items: rows.map((item) => ({
        ...item,
        hitCount: Number(item.hitCount || 0),
      })),
      stats: {
        total: Number(statsRow?.total || 0),
        active: Number(statsRow?.active || 0),
        auto: Number(statsRow?.auto || 0),
        today: Number(statsRow?.today || 0),
      },
    };
  } catch {
    throw createError({
      statusCode: 500,
      message: "Có lỗi xảy ra khi lấy danh sách IP chặn",
    });
  }
});
