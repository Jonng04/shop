/**
 * Server Middleware: Affiliate tracking
 * - Ghi nhận affiliate click khi user vào site với ?ref
 * - Tránh duplicate: check cookie affiliate_ref_tracked
 */

import { validateAffiliateRef } from "../utils/affiliate";
import { db } from "../database";
import { affiliateLinks, users } from "../database/schema";
import { and, eq, isNull, or, sql } from "drizzle-orm";

export default defineEventHandler(async (event) => {
  // Chỉ xử lý GET request
  if (event.node.req.method !== "GET") return;

  // Check nếu đã track ref này trong session
  const cookies = event.node.req.headers.cookie || "";
  if (cookies.includes("affiliate_ref_tracked=1")) return;

  // Lấy ref từ query string
  const url = new URL(event.node.req.url || "", "http://localhost");
  const refCode = url.searchParams.get("ref");

  if (!refCode) return;

  try {
    const affiliate = await validateAffiliateRef(refCode);
    if (!affiliate) return;

    // First-touch binding: user đã đăng nhập nhưng chưa có ref thì gắn 1 lần.
    // Không overwrite ref cũ và không cho self-referral.
    const session = await getUserSession(event);
    const sessionUser = session?.user as { id?: number | null } | undefined;
    const currentUserId = Number(sessionUser?.id || 0);

    if (currentUserId > 0 && currentUserId !== Number(affiliate.userId)) {
      await db
        .update(users)
        .set({ referredByRefCode: refCode.trim() })
        .where(
          and(
            eq(users.id, currentUserId),
            or(isNull(users.referredByRefCode), eq(users.referredByRefCode, ""))
          )
        );
    }

    await db
      .update(affiliateLinks)
      .set({
        totalClicks: sql`${affiliateLinks.totalClicks} + 1`,
      })
      .where(eq(affiliateLinks.refCode, refCode));

    // Set cookie để tránh track lại
    const expiresDate = new Date();
    expiresDate.setHours(expiresDate.getHours() + 1); // 1 hour
    appendHeader(
      event,
      "set-cookie",
      `affiliate_ref_tracked=1; path=/; expires=${expiresDate.toUTCString()}; SameSite=Lax`
    );
  } catch {
    // Fail silently
  }
});
