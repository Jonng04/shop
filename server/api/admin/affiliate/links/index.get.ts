import { desc, eq } from "drizzle-orm";
import type { User } from "#auth-utils";

import { db } from "../../../../database";
import { affiliateLinks, users } from "../../../../database/schema";
import {
  requireAdminAccess,
  hasAnyAdminPermission,
  type AdminSessionUser,
} from "../../../../utils/admin-permissions";

interface AdminUser extends User, AdminSessionUser {}

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event);
  const user = session.user as AdminUser;

  requireAdminAccess(user);

  const allowed = await hasAnyAdminPermission(user, ["manage_affiliates"]);

  if (!allowed) {
    throw createError({
      statusCode: 403,
      message: "Bạn không có quyền xem danh sách affiliate",
    });
  }

  try {
    // Query with LEFT JOIN để lấy user info
    const linkRecords = await db
      .select({
        link: affiliateLinks,
        user: users,
      })
      .from(affiliateLinks)
      .leftJoin(users, eq(affiliateLinks.userId, users.id))
      .orderBy(desc(affiliateLinks.id));

    const affiliatesList = linkRecords.map((item) => ({
      id: item.link.id,
      userId: item.link.userId,
      username: item.user?.username,
      email: item.user?.email,
      refCode: item.link.refCode,
      commissionRate: item.link.commissionRate,
      totalClicks: Number(item.link.totalClicks),
      totalOrders: Number(item.link.totalOrders),
      totalEarned: Number(item.link.totalEarned),
      pendingBalance: Number(item.link.pendingBalance),
      status: item.link.status,
      createdAt: item.link.createdAt,
    }));

    const totalAffiliates = affiliatesList.length;
    const activeAffiliates = affiliatesList.filter(
      (a) => a.status === "active"
    ).length;
    const totalCommission = affiliatesList.reduce(
      (sum, a) => sum + a.totalEarned,
      0
    );
    const avgCommissionRate =
      affiliatesList.length > 0
        ? Math.round(
            affiliatesList.reduce(
              (sum, a) => sum + ((a.commissionRate as number) || 0),
              0
            ) / affiliatesList.length
          )
        : 0;

    return {
      affiliateLinks: affiliatesList,
      stats: {
        totalAffiliates,
        activeAffiliates,
        totalCommission,
        avgCommissionRate,
      },
    };
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      message: error?.message || "Có lỗi xảy ra khi lấy danh sách affiliate",
    });
  }
});
