import { eq } from "drizzle-orm";
import { getRequestURL } from "h3";

import { db } from "../database";
import { users } from "../database/schema";
import { getAdminPermissionsByRoleName } from "../utils/admin-permissions";

const SKIP_PATH_PREFIXES = ["/_nuxt", "/__nuxt_error", "/favicon", "/uploads"];

export default defineEventHandler(async (event) => {
  const pathname = getRequestURL(event).pathname;

  if (SKIP_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return;
  }

  const session = await getUserSession(event);
  const currentUser = session.user as Record<string, any> | undefined;

  if (!currentUser?.id) {
    return;
  }

  try {
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, Number(currentUser.id)),
      columns: {
        id: true,
        username: true,
        email: true,
        role: true,
        status: true,
        balance: true,
        totalBalance: true,
        lastIp: true,
        device: true,
        lastLoginAt: true,
        updatedAt: true,
      },
    });

    // User bị xóa hoặc bị khóa: hủy session ngay
    if (!dbUser || dbUser.status !== "active") {
      await clearUserSession(event);
      return;
    }

    const nextPermissions = await getAdminPermissionsByRoleName(dbUser.role);
    const nextUser = {
      ...currentUser,
      ...dbUser,
      permissions: nextPermissions,
    };

    const changed = JSON.stringify(currentUser) !== JSON.stringify(nextUser);

    if (!changed) {
      return;
    }

    await setUserSession(event, {
      ...session,
      user: nextUser,
    });
  } catch (error) {
    console.error("[SessionSync] Failed to sync user session:", {
      userId: currentUser?.id,
      error: error instanceof Error ? error.message : String(error),
    });
  }
});
