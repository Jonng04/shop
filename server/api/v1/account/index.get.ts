import { db } from "../../../database";
import { users } from "../../../database/schema";
import { eq } from "drizzle-orm";
import { requireApiV1Auth } from "../../../utils/api-v1-auth";

export default defineEventHandler(async (event) => {
  const authUser = await requireApiV1Auth(event);

  const account = await db.query.users.findFirst({
    where: eq(users.id, authUser.id),
    columns: {
      id: true,
      username: true,
      email: true,
      balance: true,
      status: true,
      createdAt: true,
    },
  });

  if (!account) {
    throw createError({ statusCode: 404, message: "Account not found" });
  }

  return {
    success: true,
    data: {
      id: account.id,
      username: account.username,
      email: account.email,
      balance: Number(account.balance || 0),
      status: account.status,
      created_at: account.createdAt,
    },
  };
});
