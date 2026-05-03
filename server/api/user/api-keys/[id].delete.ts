import { and, eq } from "drizzle-orm";
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

  const id = Number(getRouterParam(event, "id"));
  if (!id) {
    throw createError({ statusCode: 400, message: "Invalid API key id" });
  }

  const [currentKey] = await db
    .select({
      id: apiKeys.id,
    })
    .from(apiKeys)
    .where(and(eq(apiKeys.id, id), eq(apiKeys.userId, Number(user.id))))
    .limit(1);

  if (!currentKey) {
    throw createError({ statusCode: 404, message: "API key not found" });
  }

  await db
    .delete(apiKeys)
    .where(and(eq(apiKeys.id, id), eq(apiKeys.userId, Number(user.id))));

  return {
    success: true,
    message: "Đã xóa API key",
  };
});
