import { inArray } from "drizzle-orm";

import { db } from "../../database";
import { settings } from "../../database/schema";

export default defineEventHandler(async () => {
  try {
    const rows = await db
      .select({
        key: settings.key,
        value: settings.value,
      })
      .from(settings)
      .where(
        inArray(settings.key, [
          "depositMinAmount",
          "depositMaxAmount",
          "depositBonusRules",
        ]),
      );

    const data = Object.fromEntries(
      rows.map((item) => [item.key, item.value]),
    ) as Record<string, string | null>;

    return {
      depositMinAmount: Number(data.depositMinAmount || 10000),
      depositMaxAmount: Number(data.depositMaxAmount || 5000000),
      depositBonusRules: String(data.depositBonusRules || ""),
    };
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      message: error?.message || "Không thể lấy cấu hình nạp tiền",
    });
  }
});
