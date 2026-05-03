import { and, eq } from "drizzle-orm";
import type { User } from "#auth-utils";

import { db } from "../../../../database";
import { apiKeys } from "../../../../database/schema";
import { generateApiSecretCredential } from "../../../../utils/api-key";
import { type AdminSessionUser } from "../../../../utils/admin-permissions";

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
      apiKey: apiKeys.apiKey,
      status: apiKeys.status,
      expiresAt: apiKeys.expiresAt,
      revokedAt: apiKeys.revokedAt,
    })
    .from(apiKeys)
    .where(and(eq(apiKeys.id, id), eq(apiKeys.userId, Number(user.id))))
    .limit(1);

  if (!currentKey) {
    throw createError({ statusCode: 404, message: "API key not found" });
  }

  if (currentKey.status === "revoked" || currentKey.revokedAt) {
    throw createError({ statusCode: 400, message: "API key đã bị xóa" });
  }

  if (currentKey.expiresAt && new Date(currentKey.expiresAt).getTime() < Date.now()) {
    throw createError({
      statusCode: 400,
      message: "API key đã hết hạn, vui lòng tạo key mới",
    });
  }

  const { apiSecret, secretHash } = generateApiSecretCredential();

  await db
    .update(apiKeys)
    .set({
      secretHash,
      updatedAt: new Date(),
      lastUsedAt: null,
    })
    .where(and(eq(apiKeys.id, id), eq(apiKeys.userId, Number(user.id))));

  return {
    success: true,
    message: "Đã tạo lại API secret",
    data: {
      id: currentKey.id,
      apiKey: currentKey.apiKey,
      apiSecret,
      expiresAt: currentKey.expiresAt,
      updatedAt: new Date(),
    },
  };
});
