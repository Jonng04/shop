import { eq, inArray } from "drizzle-orm";

import { db } from "../../../database";
import { settings } from "../../../database/schema";
import { createDatabaseBackup } from "../../../utils/database-backup";

const getSettingMap = async (keys: string[]) => {
  const rows = await db
    .select()
    .from(settings)
    .where(inArray(settings.key, keys));

  return new Map(rows.map((row) => [row.key, row.value]));
};

const getBooleanSetting = (value: string | null | undefined, fallback = false) =>
  value === null || value === undefined ? fallback : value === "true" || value === "1";

const getNumberSetting = (value: string | null | undefined, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const requestSecret = String(
    getHeader(event, "x-cron-secret") || query.secret || "",
  ).trim();

  const settingMap = await getSettingMap([
    "cronSecretKey",
    "autoBackupEnabled",
    "autoBackupIntervalValue",
    "autoBackupIntervalUnit",
    "autoBackupRetentionCount",
    "autoBackupLastRunAt",
  ]);

  const cronSecret = String(settingMap.get("cronSecretKey") || "").trim();
  if (!cronSecret || requestSecret !== cronSecret) {
    throw createError({
      statusCode: 401,
      message: "Cron secret không hợp lệ",
    });
  }

  const enabled = getBooleanSetting(settingMap.get("autoBackupEnabled"), false);
  if (!enabled) {
    return {
      success: true,
      skipped: true,
      message: "Tự động backup đang tắt",
    };
  }

  const intervalUnit = String(settingMap.get("autoBackupIntervalUnit") || "hour");
  const intervalValue = Math.max(
    getNumberSetting(settingMap.get("autoBackupIntervalValue"), 24),
    1,
  );
  const retentionCount = Math.max(
    getNumberSetting(settingMap.get("autoBackupRetentionCount"), 7),
    1,
  );
  const lastRunRaw = String(settingMap.get("autoBackupLastRunAt") || "").trim();
  const lastRunAt = lastRunRaw ? new Date(lastRunRaw) : null;
  const now = new Date();
  const intervalMs =
    intervalUnit === "minute"
      ? intervalValue * 60 * 1000
      : intervalValue * 60 * 60 * 1000;

  if (lastRunAt && now.getTime() - lastRunAt.getTime() < intervalMs) {
    return {
      success: true,
      skipped: true,
      message: "Chưa đến lịch backup",
    };
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw createError({
      statusCode: 500,
      message: "Thiếu cấu hình DATABASE_URL",
    });
  }

  const backup = await createDatabaseBackup({
    databaseUrl,
    retentionCount,
  });

  const nextValue = now.toISOString();
  const [existingLastRun] = await db
    .select()
    .from(settings)
    .where(eq(settings.key, "autoBackupLastRunAt"))
    .limit(1);

  if (existingLastRun) {
    await db
      .update(settings)
      .set({ value: nextValue })
      .where(eq(settings.key, "autoBackupLastRunAt"));
  } else {
    await db.insert(settings).values({
      key: "autoBackupLastRunAt",
      value: nextValue,
    });
  }

  return {
    success: true,
    skipped: false,
    filename: backup.filename,
    url: backup.url,
    ranAt: nextValue,
  };
});
