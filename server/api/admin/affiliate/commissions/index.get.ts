import { desc, eq, inArray } from "drizzle-orm";
import type { User } from "#auth-utils";

import { db } from "../../../../database";
import {
  affiliateCommissions,
  orders,
  users,
} from "../../../../database/schema";
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
      message: "Bạn không có quyền xem danh sách hoa hồng",
    });
  }

  try {
    // Query with LEFT JOIN để lấy affiliate username và referred user username
    const commissionRecords = await db
      .select({
        commission: affiliateCommissions,
        affiliateUser: users,
      })
      .from(affiliateCommissions)
      .leftJoin(users, eq(affiliateCommissions.affiliateUserId, users.id))
      .orderBy(desc(affiliateCommissions.id));

    const referredUserIds = [
      ...new Set(
        commissionRecords
          .map((item) => Number(item.commission.referredUserId || 0))
          .filter((id) => id > 0)
      ),
    ];

    const orderIds = [
      ...new Set(
        commissionRecords
          .map((item) => Number(item.commission.orderId || 0))
          .filter((id) => id > 0)
      ),
    ];

    const [referredUsers, orderRows] = await Promise.all([
      referredUserIds.length
        ? db
            .select({
              id: users.id,
              username: users.username,
            })
            .from(users)
            .where(inArray(users.id, referredUserIds))
        : Promise.resolve([]),
      orderIds.length
        ? db
            .select({
              id: orders.id,
              orderCode: orders.orderCode,
            })
            .from(orders)
            .where(inArray(orders.id, orderIds))
        : Promise.resolve([]),
    ]);

    const referredUserMap = new Map(
      referredUsers.map((item) => [Number(item.id), item.username])
    );
    const orderMap = new Map(
      orderRows.map((item) => [Number(item.id), item.orderCode])
    );

    const commissionsList = commissionRecords.map((item) => ({
      id: item.commission.id,
      affiliateUserId: item.commission.affiliateUserId,
      affiliateUsername: item.affiliateUser?.username,
      referredUserId: item.commission.referredUserId,
      referredUsername: item.commission.referredUserId
        ? referredUserMap.get(Number(item.commission.referredUserId)) || null
        : null,
      orderId: item.commission.orderId,
      orderCode: item.commission.orderId
        ? orderMap.get(Number(item.commission.orderId)) || null
        : null,
      commissionRate: item.commission.commissionRate,
      orderAmount: Number(item.commission.orderAmount),
      commissionAmount: Number(item.commission.commissionAmount),
      status: item.commission.status,
      note: item.commission.note,
      createdAt: item.commission.createdAt,
    }));

    // Calculate stats
    const totalCommissions = commissionsList.reduce(
      (sum, c) => sum + c.commissionAmount,
      0
    );
    const successAmount = commissionsList
      .filter((c) => c.status === "paid")
      .reduce((sum, c) => sum + c.commissionAmount, 0);
    const cancelledAmount = commissionsList
      .filter((c) => c.status === "cancelled")
      .reduce((sum, c) => sum + c.commissionAmount, 0);

    return {
      commissions: commissionsList,
      stats: {
        totalCommissions,
        successAmount,
        cancelledAmount,
      },
    };
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      message: error?.message || "Có lỗi xảy ra khi lấy danh sách hoa hồng",
    });
  }
});
