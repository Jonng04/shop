import type { User } from "#auth-utils";

import { db } from "../../database";
import {
  affiliateLinks,
  affiliateCommissions,
  orders,
  settings,
  users,
} from "../../database/schema";
import { eq, inArray } from "drizzle-orm";

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
    // Get affiliate link for this user
    const affLink = await db.query.affiliateLinks.findFirst({
      where: eq(affiliateLinks.userId, user.id),
    });

    if (!affLink) {
      throw createError({
        statusCode: 404,
        message: "Người dùng chưa tham gia chương trình affiliate",
      });
    }

    // Get all commissions for this user with related user info
    const commissionRecords = await db
      .select({
        commission: affiliateCommissions,
        referredUser: users,
      })
      .from(affiliateCommissions)
      .leftJoin(users, eq(affiliateCommissions.referredUserId, users.id))
      .where(eq(affiliateCommissions.affiliateUserId, user.id));

    // Calculate stats
    const totalEarned = commissionRecords
      .filter(
        (c) =>
          c.commission.status === "paid" ||
          c.commission.status === "approved" ||
          c.commission.status === "pending"
      )
      .reduce((sum, c) => sum + Number(c.commission.commissionAmount), 0);

    const pendingEarned = 0;

    const totalClicks = Number(affLink.totalClicks || 0);
    const totalOrders = Number(affLink.totalOrders || 0);

    const commissionRateRow = await db.query.settings.findFirst({
      where: eq(settings.key, "affiliateCommissionRate"),
      columns: { value: true },
    });

    const commissionRate = Math.max(
      0,
      Math.min(100, Number(commissionRateRow?.value || 10) || 10)
    );

    const orderIds = [
      ...new Set(
        commissionRecords
          .map((item) => Number(item.commission.orderId || 0))
          .filter((id) => id > 0)
      ),
    ];

    const orderRows = orderIds.length
      ? await db
          .select({
            id: orders.id,
            orderCode: orders.orderCode,
          })
          .from(orders)
          .where(inArray(orders.id, orderIds))
      : [];

    const orderMap = new Map(
      orderRows.map((item) => [Number(item.id), item.orderCode])
    );

    // Format commissions as history
    const history = commissionRecords.map((item) => ({
      id: item.commission.id,
      date: new Date(item.commission.createdAt!).toLocaleString("vi-VN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }),
      buyer: item.referredUser?.username || "Ẩn danh",
      product: item.commission.orderId
        ? `Đơn hàng ${orderMap.get(Number(item.commission.orderId)) || `#${item.commission.orderId}`}`
        : "Đơn hàng không xác định",
      commission: Number(item.commission.commissionAmount),
      status: item.commission.status === "cancelled" ? "cancelled" : "paid",
    }));

    return {
      stats: {
        totalEarned,
        pendingEarned,
        totalClicks,
        totalOrders,
        commissionRate,
      },
      refCode: affLink.refCode,
      history,
    };
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      message: error?.message || "Có lỗi xảy ra khi lấy dữ liệu affiliate",
    });
  }
});
