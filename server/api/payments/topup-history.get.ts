import { and, desc, eq } from "drizzle-orm";
import type { User } from "#auth-utils";

import { db } from "../../database";
import { payments } from "../../database/schema";
import { type AdminSessionUser } from "../../utils/admin-permissions";

interface SessionUser extends User, AdminSessionUser {}

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event);
  const user = session.user as SessionUser | undefined;

  if (!user?.id) {
    throw createError({
      statusCode: 401,
      message: "Vui l\u00f2ng \u0111\u0103ng nh\u1eadp \u0111\u1ec3 xem l\u1ecbch s\u1eed n\u1ea1p ti\u1ec1n",
    });
  }

  const userId = Number(user.id);
  const limit = Math.min(Math.max(Number(getQuery(event).limit || 100), 1), 200);

  const rows = await db.query.payments.findMany({
    where: and(eq(payments.userId, userId), eq(payments.type, "topup")),
    orderBy: [desc(payments.id)],
    limit,
    columns: {
      id: true,
      paymentCode: true,
      status: true,
      amount: true,
      receivedAmount: true,
      transferContent: true,
      referenceCode: true,
      createdAt: true,
      paidAt: true,
      expiredAt: true,
    },
  });

  return rows.map((item) => ({
    id: item.id,
    paymentCode: item.paymentCode,
    status: item.status,
    amount: Number(item.amount || 0),
    receivedAmount: Number(item.receivedAmount || 0),
    transferContent: item.transferContent || null,
    referenceCode: item.referenceCode || null,
    createdAt: item.createdAt || null,
    paidAt: item.paidAt || null,
    expiredAt: item.expiredAt || null,
  }));
});
