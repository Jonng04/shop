import { desc, eq } from "drizzle-orm";
import type { User } from "#auth-utils";
import { db } from "../../../database";
import { apiKeys } from "../../../database/schema";
import { type AdminSessionUser } from "../../../utils/admin-permissions";

interface SessionUser extends User, AdminSessionUser {}

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event);
  const user = session.user as SessionUser | undefined;

  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  const userId = Number(user.id);

  const rows = await db.query.apiKeys.findMany({
    where: eq(apiKeys.userId, userId),
    columns: {
      id: true,
      name: true,
      apiKey: true,
      status: true,
      lastUsedAt: true,
      expiresAt: true,
      revokedAt: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: [desc(apiKeys.id)],
  });

  const now = Date.now();
  const items = rows.map((item) => {
    const expiresAt = item.expiresAt ? new Date(item.expiresAt).getTime() : null;
    const isExpired = expiresAt !== null && expiresAt < now;
    const status =
      item.status === "revoked" || item.revokedAt
        ? "revoked"
        : isExpired
          ? "expired"
          : "active";

    return {
      ...item,
      status,
    };
  });

  const activeCount = items.filter((item) => item.status === "active").length;
  const inactiveCount = items.length - activeCount;

  return {
    items,
    stats: {
      total: items.length,
      active: activeCount,
      inactive: inactiveCount,
    },
  };
});
