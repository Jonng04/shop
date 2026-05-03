/**
 * API: Get referrals for current user
 * GET /api/affiliate/referrals
 *
 * Lấy danh sách users đã register qua ref code của user
 */

import type { User } from "#auth-utils";
import { db } from "../../database";
import { users, affiliateLinks } from "../../database/schema";
import { eq } from "drizzle-orm";

interface SessionUser extends User {
  id?: number;
}

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event);
  const user = session.user as SessionUser;

  if (!user?.id) {
    throw createError({
      statusCode: 401,
      message: "Vui lòng đăng nhập",
    });
  }

  try {
    // Get user's affiliate link (để lấy ref code)
    const affiliateLink = await db.query.affiliateLinks.findFirst({
      where: eq(affiliateLinks.userId, user.id),
    });

    if (!affiliateLink) {
      throw createError({
        statusCode: 404,
        message: "Người dùng chưa có affiliate link",
      });
    }

    // Get all users who registered with this user's ref code
    const referrals = await db.query.users.findMany({
      where: eq(users.referredByRefCode, affiliateLink.refCode),
      columns: {
        id: true,
        username: true,
        email: true,
        createdAt: true,
      },
    });

    return {
      success: true,
      refCode: affiliateLink.refCode,
      totalReferrals: referrals.length,
      referrals: referrals.map((r) => ({
        id: r.id,
        username: r.username,
        email: r.email,
        joinedAt: r.createdAt,
      })),
    };
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      message: error?.message || "Có lỗi xảy ra",
    });
  }
});
