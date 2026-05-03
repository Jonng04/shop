/**
 * API: Tạo affiliate link cho user
 * POST /api/affiliate/create
 *
 * Mỗi user chỉ có 1 affiliate link
 * Nếu có rồi thì return existing
 */

import { eq } from "drizzle-orm";
import type { User } from "#auth-utils";

import { db } from "../../database";
import { affiliateLinks, settings } from "../../database/schema";

interface SessionUser extends User {
  id?: number;
  username?: string;
}

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event);
  const user = session.user as SessionUser;

  if (!user?.id || !user?.username) {
    throw createError({
      statusCode: 401,
      message: "Vui lòng đăng nhập",
    });
  }

  try {
    const affiliateEnabledRow = await db.query.settings.findFirst({
      where: eq(settings.key, "affiliateEnabled"),
      columns: { value: true },
    });

    const isAffiliateEnabled =
      String(affiliateEnabledRow?.value || "true")
        .trim()
        .toLowerCase() !== "false";

    if (!isAffiliateEnabled) {
      throw createError({
        statusCode: 403,
        message: "Chương trình affiliate hiện đang tạm tắt",
      });
    }

    const defaultRateRow = await db.query.settings.findFirst({
      where: eq(settings.key, "affiliateCommissionRate"),
      columns: { value: true },
    });
    const defaultCommissionRate = Math.max(
      0,
      Math.min(100, Number(defaultRateRow?.value || 10) || 10)
    );

    // Check xem user đã có affiliate link chưa
    const existing = await db.query.affiliateLinks.findFirst({
      where: eq(affiliateLinks.userId, user.id),
    });

    if (existing) {
      return {
        success: true,
        message: "Affiliate link đã tồn tại",
        data: {
          id: existing.id,
          refCode: existing.refCode,
          commissionRate: existing.commissionRate,
          status: existing.status,
          createdAt: existing.createdAt,
        },
      };
    }

    // Tạo affiliate link mới
    const refCode = user.username; // Dùng username làm ref code

    const newLink = await db.insert(affiliateLinks).values({
      userId: user.id,
      refCode,
      commissionRate: defaultCommissionRate,
      totalClicks: 0,
      totalOrders: 0,
      totalEarned: 0,
      pendingBalance: 0,
      status: "active",
    });

    // Lấy record vừa tạo
    const created = await db.query.affiliateLinks.findFirst({
      where: eq(affiliateLinks.userId, user.id),
    });

    return {
      success: true,
      message: "Affiliate link tạo thành công",
      data: {
        id: created!.id,
        refCode: created!.refCode,
        commissionRate: created!.commissionRate,
        status: created!.status,
        createdAt: created!.createdAt,
      },
    };
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      message: error?.message || "Có lỗi xảy ra khi tạo affiliate link",
    });
  }
});
