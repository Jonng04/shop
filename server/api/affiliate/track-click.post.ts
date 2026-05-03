/**
 * API: Track affiliate click
 * POST /api/affiliate/track-click
 * - Nhận ref code từ body
 * - Increment totalClicks counter
 */

import { eq } from "drizzle-orm";
import { db } from "../../database";
import { affiliateLinks } from "../../database/schema";
import { validateAffiliateRef } from "../../utils/affiliate";

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const refCode = body.ref as string | undefined;

  if (!refCode) {
    return {
      success: false,
      message: "Thiếu mã affiliate",
    };
  }

  try {
    const affiliate = await validateAffiliateRef(refCode);

    if (!affiliate) {
      return {
        success: false,
        message: "Mã affiliate không hợp lệ",
      };
    }

    // Get current affiliate link
    const currentLink = await db.query.affiliateLinks.findFirst({
      where: eq(affiliateLinks.refCode, refCode),
    });

    // Increment totalClicks
    const newClicks = Number(currentLink?.totalClicks || 0) + 1;

    await db
      .update(affiliateLinks)
      .set({
        totalClicks: newClicks,
      })
      .where(eq(affiliateLinks.refCode, refCode));

    return {
      success: true,
      message: "Ghi nhận click thành công",
      data: {
        userId: affiliate.userId,
        commissionRate: affiliate.commissionRate,
      },
    };
  } catch (error: any) {
    return {
      success: false,
      message: error?.message || "Có lỗi xảy ra",
    };
  }
});
