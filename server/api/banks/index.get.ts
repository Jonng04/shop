import { asc, eq } from "drizzle-orm";

import { db } from "../../database";
import { banks } from "../../database/schema";

export default defineEventHandler(async () => {
  try {
    const rows = await db.query.banks.findMany({
      where: eq(banks.status, "active"),
      orderBy: [asc(banks.bankName)],
      columns: {
        id: true,
        bankName: true,
        bankCode: true,
        accountNumber: true,
        accountName: true,
        status: true,
      },
    });

    return rows;
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      message: error?.message || "Không thể lấy danh sách ngân hàng",
    });
  }
});
