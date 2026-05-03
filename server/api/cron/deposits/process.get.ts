import { timingSafeEqual } from "node:crypto";

import { eq } from "drizzle-orm";

import { processPendingTopupInvoices } from "../../../utils/deposit-cron";
import { db } from "../../../database";
import { settings } from "../../../database/schema";

const isValidCronSecret = (incoming: string, expected: string) => {
  const incomingBuffer = Buffer.from(String(incoming || ""));
  const expectedBuffer = Buffer.from(String(expected || ""));

  if (
    incomingBuffer.length === 0 ||
    incomingBuffer.length !== expectedBuffer.length
  ) {
    return false;
  }

  return timingSafeEqual(incomingBuffer, expectedBuffer);
};

export default defineEventHandler(async (event) => {
  const configuredSecret = await db.query.settings.findFirst({
    where: eq(settings.key, "cronSecretKey"),
    columns: {
      value: true,
    },
  });

  const expectedSecret = String(configuredSecret?.value || "").trim();

  if (!expectedSecret) {
    throw createError({
      statusCode: 503,
      message: "Cron secret chưa được cấu hình",
    });
  }

  const query = getQuery(event);
  const incomingSecret = String(
    getHeader(event, "x-cron-secret") || query.secret || ""
  ).trim();

  if (!isValidCronSecret(incomingSecret, expectedSecret)) {
    throw createError({
      statusCode: 403,
      message: "Cron secret không hợp lệ",
    });
  }

  const result = await processPendingTopupInvoices();

  return {
    success: true,
    ...result,
  };
});
