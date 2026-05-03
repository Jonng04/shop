import { and, eq } from "drizzle-orm";
import type { User } from "#auth-utils";

import { db } from "../../../../../database";
import { orderItems, orders, plans } from "../../../../../database/schema";
import {
  hasAdminPermission,
  requireAdminAccess,
  type AdminSessionUser,
} from "../../../../../utils/admin-permissions";
import { processAffiliateCommissionForOrder } from "../../../../../utils/affiliate-commission";

interface AdminUser extends User, AdminSessionUser {}

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event);
  const user = session.user as AdminUser;

  requireAdminAccess(user);

  const allowed = await hasAdminPermission(user, "manage_orders");
  if (!allowed) {
    throw createError({
      statusCode: 403,
      message: "Bạn không có quyền xử lý đơn hàng",
    });
  }

  const orderCode = String(getRouterParam(event, "id") || "").trim();
  const itemId = Number(getRouterParam(event, "itemId") || 0);
  const body = await readBody(event);
  const deliveredContent = String(body?.deliveredContent || "").trim();

  if (!orderCode) {
    throw createError({
      statusCode: 400,
      message: "Mã đơn hàng không hợp lệ",
    });
  }

  if (!itemId || Number.isNaN(itemId)) {
    throw createError({
      statusCode: 400,
      message: "Item đơn hàng không hợp lệ",
    });
  }

  if (!deliveredContent) {
    throw createError({
      statusCode: 400,
      message: "Vui lòng nhập nội dung đơn hàng",
    });
  }

  const now = new Date();

  const result = await db.transaction(async (tx) => {
    const orderRow = await tx.query.orders.findFirst({
      where: eq(orders.orderCode, orderCode),
      columns: {
        id: true,
        orderCode: true,
        status: true,
        processingAt: true,
      },
    });

    if (!orderRow) {
      throw createError({
        statusCode: 404,
        message: "Không tìm thấy đơn hàng",
      });
    }

    if (orderRow.status === "cancelled" || orderRow.status === "refunded") {
      throw createError({
        statusCode: 400,
        message: "Đơn hàng đã kết thúc, không thể cập nhật nội dung",
      });
    }

    const orderItem = await tx.query.orderItems.findFirst({
      where: and(
        eq(orderItems.id, itemId),
        eq(orderItems.orderId, orderRow.id)
      ),
      columns: {
        id: true,
        status: true,
        planId: true,
      },
    });

    if (!orderItem) {
      throw createError({
        statusCode: 404,
        message: "Không tìm thấy sản phẩm trong đơn",
      });
    }

    if (orderItem.status === "cancelled" || orderItem.status === "failed") {
      throw createError({
        statusCode: 400,
        message: "Item này không thể giao nội dung",
      });
    }

    const planRow = orderItem.planId
      ? await tx.query.plans.findFirst({
          where: eq(plans.id, orderItem.planId),
          columns: { deliveryType: true },
        })
      : null;

    if (planRow?.deliveryType === "instant") {
      throw createError({
        statusCode: 400,
        message: "Gói giao ngay không hỗ trợ nhập tay nội dung đơn hàng",
      });
    }

    await tx
      .update(orderItems)
      .set({
        deliveredContent,
        status: "delivered",
        reason: null,
        deliveredAt: now,
      })
      .where(
        and(eq(orderItems.id, itemId), eq(orderItems.orderId, orderRow.id))
      );

    const allItems = await tx.query.orderItems.findMany({
      where: eq(orderItems.orderId, orderRow.id),
      columns: { status: true },
    });

    const hasItems = allItems.length > 0;
    const allDelivered =
      hasItems && allItems.every((item) => item.status === "delivered");
    const anyDelivered = allItems.some((item) => item.status === "delivered");

    if (allDelivered) {
      await tx
        .update(orders)
        .set({
          fulfillmentStatus: "delivered",
          status: "completed",
          processingAt: orderRow.processingAt || now,
          deliveredAt: now,
          completedAt: now,
        })
        .where(eq(orders.id, orderRow.id));

      try {
        await processAffiliateCommissionForOrder(tx, orderRow.id);
      } catch {
        // Không block flow giao tay nếu affiliate xử lý lỗi
      }
    } else if (anyDelivered) {
      await tx
        .update(orders)
        .set({
          fulfillmentStatus: "partially_delivered",
          status: "processing",
          processingAt: orderRow.processingAt || now,
          completedAt: null,
        })
        .where(eq(orders.id, orderRow.id));
    } else {
      await tx
        .update(orders)
        .set({
          fulfillmentStatus: "pending",
          status: "processing",
          processingAt: orderRow.processingAt || now,
          completedAt: null,
        })
        .where(eq(orders.id, orderRow.id));
    }

    return {
      orderCode: orderRow.orderCode,
      orderItemId: orderItem.id,
      allDelivered,
    };
  });

  return {
    success: true,
    ...result,
  };
});
