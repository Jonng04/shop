import type { User } from "#auth-utils";
import { and, eq, gte, isNull, or, sql } from "drizzle-orm";

import { db } from "../../../database";
import { apiKeys } from "../../../database/schema";
import { generateApiCredential } from "../../../utils/api-key";
import { type AdminSessionUser } from "../../../utils/admin-permissions";

interface SessionUser extends User, AdminSessionUser {}

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event);
  const user = session.user as SessionUser | undefined;

  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  const body = await readBody(event);
  const name = String(body?.name || "").trim();
  const expiresDays = Number(body?.expiresDays || 0);

  if (name.length > 120) {
    throw createError({
      statusCode: 400,
      message: "Tên API key tối đa 120 ký tự",
    });
  }

  if (expiresDays < 0 || expiresDays > 3650) {
    throw createError({
      statusCode: 400,
      message: "Thời hạn key không hợp lệ",
    });
  }

  const now = new Date();
  const [activeKeysCount] = await db
    .select({ total: sql<number>`count(*)` })
    .from(apiKeys)
    .where(
      and(
        eq(apiKeys.userId, Number(user.id)),
        eq(apiKeys.status, "active"),
        or(isNull(apiKeys.expiresAt), gte(apiKeys.expiresAt, now))
      )
    );

  if (Number(activeKeysCount?.total || 0) >= 5) {
    throw createError({
      statusCode: 400,
      message: "Tối đa 5 API key đang hoạt động. Hãy xóa key cũ trước khi tạo mới.",
    });
  }

  const { apiKey, apiSecret, secretHash } = generateApiCredential();
  const expiresAt =
    expiresDays > 0
      ? new Date(Date.now() + expiresDays * 24 * 60 * 60 * 1000)
      : null;

  const inserted = await db
    .insert(apiKeys)
    .values({
      userId: Number(user.id),
      name: name || null,
      apiKey,
      secretHash,
      status: "active",
      expiresAt,
    })
    .$returningId();

  return {
    success: true,
    message: "Đã tạo API key mới",
    data: {
      id: inserted?.[0]?.id || null,
      name: name || null,
      apiKey,
      apiSecret,
      expiresAt,
      createdAt: new Date(),
    },
  };
});
