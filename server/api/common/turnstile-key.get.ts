import { eq } from "drizzle-orm";
import { db } from "../../database";
import { settings } from "../../database/schema";

export default defineEventHandler(async () => {
  const enabledRow = await db.query.settings.findFirst({
    where: eq(settings.key, "turnstileEnabled"),
  });
  const siteKeyRow = await db.query.settings.findFirst({
    where: eq(settings.key, "turnstileSiteKey"),
  });

  const enabled = enabledRow
    ? ["1", "true", "on", "yes"].includes(
        String(enabledRow.value || "")
          .trim()
          .toLowerCase()
      )
    : false;
  const siteKey = enabled ? String(siteKeyRow?.value || "") : "";

  return {
    enabled,
    siteKey,
  };
});
