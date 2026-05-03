import { eq } from "drizzle-orm";

import { db } from "../database";
import { settings } from "../database/schema";

const CATALOG_CACHE_VERSION_KEY = "catalogCacheVersion";

export async function getCatalogCacheVersion(): Promise<string> {
  const row = await db.query.settings.findFirst({
    where: eq(settings.key, CATALOG_CACHE_VERSION_KEY),
    columns: { value: true },
  });

  const version = String(row?.value || "").trim();
  return version || "1";
}

export async function bumpCatalogCacheVersion(): Promise<string> {
  const nextVersion = String(Date.now());

  const existing = await db.query.settings.findFirst({
    where: eq(settings.key, CATALOG_CACHE_VERSION_KEY),
    columns: { key: true },
  });

  if (existing?.key) {
    await db
      .update(settings)
      .set({ value: nextVersion })
      .where(eq(settings.key, CATALOG_CACHE_VERSION_KEY));
  } else {
    await db.insert(settings).values({
      key: CATALOG_CACHE_VERSION_KEY,
      value: nextVersion,
    });
  }

  return nextVersion;
}
