import { eq } from "drizzle-orm";
import type { User } from "#auth-utils";
import { db } from "../../database";
import { users } from "../../database/schema";
import { type AdminSessionUser } from "../../utils/admin-permissions";

interface SessionUser extends User, AdminSessionUser {}

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event);
  const user = session.user as SessionUser | undefined;

  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  const dbUser = await db.query.users.findFirst({
    where: eq(users.id, user.id as number),
    columns: { id: true, email: true, balance: true },
  });

  if (!dbUser) {
    throw createError({ statusCode: 404, message: "User not found" });
  }

  return dbUser;
});
