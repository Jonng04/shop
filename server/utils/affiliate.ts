/**
 * Server Utils: Affiliate tracking
 * - Lấy affiliate ref code từ cookie request
 * - Kiểm tra ref code có hợp lệ không
 */

import { db } from "../database";
import { affiliateLinks } from "../database/schema";
import { eq } from "drizzle-orm";

export const getAffiliateRefFromRequest = (
  cookieHeader: string | undefined
): string | null => {
  if (!cookieHeader) return null;

  const cookies = cookieHeader.split(";");
  for (let cookie of cookies) {
    cookie = cookie.trim();
    if (cookie.startsWith("affiliate_ref=")) {
      const value = cookie.substring("affiliate_ref=".length);
      return decodeURIComponent(value);
    }
  }
  return null;
};

export const validateAffiliateRef = async (
  refCode: string
): Promise<{ userId: number; commissionRate: number } | null> => {
  if (!refCode || refCode.trim() === "") return null;

  try {
    const link = await db.query.affiliateLinks.findFirst({
      where: eq(affiliateLinks.refCode, refCode.trim()),
    });

    if (!link || link.status !== "active") {
      return null;
    }

    return {
      userId: link.userId,
      commissionRate: link.commissionRate || 10,
    };
  } catch {
    return null;
  }
};
