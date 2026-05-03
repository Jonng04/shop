import { eq } from "drizzle-orm";
import { getHeader, type H3Event } from "h3";
import { db } from "../database";
import { apiKeys, users } from "../database/schema";
import { verifyApiSecret } from "./api-key";

export interface ApiV1User {
  id: number;
  username: string;
  email: string;
  balance: number;
  status: string;
  apiKey: string;
}

export const requireApiV1Auth = async (event: H3Event): Promise<ApiV1User> => {
  const apiKey = String(getHeader(event, "x-api-key") || "").trim();
  const apiSecret = String(getHeader(event, "x-api-secret") || "").trim();

  if (!apiKey || !apiSecret) {
    throw createError({
      statusCode: 401,
      message: "Missing API credentials",
    });
  }

  const [account] = await db
    .select({
      userId: users.id,
      username: users.username,
      email: users.email,
      balance: users.balance,
      userStatus: users.status,
      apiKey: apiKeys.apiKey,
      apiKeyStatus: apiKeys.status,
      secretHash: apiKeys.secretHash,
      expiresAt: apiKeys.expiresAt,
      revokedAt: apiKeys.revokedAt,
      apiKeyId: apiKeys.id,
    })
    .from(apiKeys)
    .innerJoin(users, eq(apiKeys.userId, users.id))
    .where(eq(apiKeys.apiKey, apiKey))
    .limit(1);

  if (!account || !account.apiKey) {
    throw createError({
      statusCode: 401,
      message: "Invalid API key",
    });
  }

  if (account.userStatus !== "active") {
    throw createError({
      statusCode: 403,
      message: "Account is not active",
    });
  }

  if (String(account.apiKeyStatus || "active") !== "active" || account.revokedAt) {
    throw createError({
      statusCode: 401,
      message: "API key is revoked",
    });
  }

  if (account.expiresAt && new Date(account.expiresAt).getTime() < Date.now()) {
    throw createError({
      statusCode: 401,
      message: "API key has expired",
    });
  }

  if (!verifyApiSecret(apiSecret, String(account.secretHash || ""))) {
    throw createError({
      statusCode: 401,
      message: "Invalid API secret",
    });
  }

  await db
    .update(apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiKeys.id, Number(account.apiKeyId || 0)));

  return {
    id: Number(account.userId),
    username: String(account.username || ""),
    email: String(account.email || ""),
    balance: Number(account.balance || 0),
    status: String(account.userStatus || "active"),
    apiKey: String(account.apiKey),
  };
};
