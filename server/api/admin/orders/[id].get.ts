import { desc, eq } from "drizzle-orm";
import type { User } from "#auth-utils";

import { db } from "../../../database";
import {
  orderItems,
  orders,
  payments,
  plans,
  transactions,
  users,
} from "../../../database/schema";
import {
  hasAnyAdminPermission,
  requireAdminAccess,
  type AdminSessionUser,
} from "../../../utils/admin-permissions";

interface AdminUser extends User, AdminSessionUser {}

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event);
  const user = session.user as AdminUser;

  requireAdminAccess(user);

  const allowed = await hasAnyAdminPermission(user, [
    "view_orders",
    "manage_orders",
  ]);

  if (!allowed) {
    throw createError({
      statusCode: 403,
      message: "Bạn không có quyền xem chi tiết đơn hàng",
    });
  }

  const orderCode = String(getRouterParam(event, "id") || "").trim();

  if (!orderCode) {
    throw createError({
      statusCode: 400,
      message: "Mã đơn hàng không hợp lệ",
    });
  }

  const order = await db
    .select({
      id: orders.id,
      orderCode: orders.orderCode,
      userId: orders.userId,
      username: users.username,
      email: users.email,
      userStatus: users.status,
      lastIp: users.lastIp,
      status: orders.status,
      fulfillmentStatus: orders.fulfillmentStatus,
      orderType: orders.orderType,
      paymentType: orders.paymentType,
      subtotalAmount: orders.subtotalAmount,
      discountAmount: orders.discountAmount,
      totalAmount: orders.totalAmount,
      customerNote: orders.customerNote,
      adminNote: orders.adminNote,
      reason: orders.reason,
      createdAt: orders.createdAt,
      updatedAt: orders.updatedAt,
      processingAt: orders.processingAt,
      deliveredAt: orders.deliveredAt,
      completedAt: orders.completedAt,
      cancelledAt: orders.cancelledAt,
      refundedAt: orders.refundedAt,
      paymentStatus: payments.status,
      paymentCode: payments.paymentCode,
      paymentAmount: payments.amount,
      referenceCode: payments.referenceCode,
      transferContent: payments.transferContent,
      paidAt: payments.paidAt,
    })
    .from(orders)
    .leftJoin(users, eq(orders.userId, users.id))
    .leftJoin(payments, eq(orders.paymentId, payments.id))
    .where(eq(orders.orderCode, orderCode))
    .limit(1);

  const orderRow = order[0];

  if (!orderRow) {
    throw createError({
      statusCode: 404,
      message: "Không tìm thấy đơn hàng",
    });
  }

  const [items, transactionRows] = await Promise.all([
    db
      .select({
        id: orderItems.id,
        productId: orderItems.productId,
        planId: orderItems.planId,
        productName: orderItems.productName,
        planName: orderItems.planName,
        quantity: orderItems.quantity,
        unitPrice: orderItems.unitPrice,
        subtotalAmount: orderItems.subtotalAmount,
        discountAmount: orderItems.discountAmount,
        totalAmount: orderItems.totalAmount,
        status: orderItems.status,
        reason: orderItems.reason,
        deliveredContent: orderItems.deliveredContent,
        deliveryType: plans.deliveryType,
        deliveredAt: orderItems.deliveredAt,
        createdAt: orderItems.createdAt,
      })
      .from(orderItems)
      .leftJoin(plans, eq(orderItems.planId, plans.id))
      .where(eq(orderItems.orderId, orderRow.id))
      .orderBy(desc(orderItems.id)),
    db
      .select({
        id: transactions.id,
        amount: transactions.amount,
        balanceBefore: transactions.balanceBefore,
        balanceAfter: transactions.balanceAfter,
        type: transactions.type,
        description: transactions.description,
        createdAt: transactions.createdAt,
      })
      .from(transactions)
      .where(eq(transactions.orderId, orderRow.id))
      .orderBy(desc(transactions.id)),
  ]);

  return {
    ...orderRow,
    subtotalAmount: Number(orderRow.subtotalAmount || 0),
    discountAmount: Number(orderRow.discountAmount || 0),
    totalAmount: Number(orderRow.totalAmount || 0),
    paymentAmount: Number(orderRow.paymentAmount || 0),
    items: items.map((item) => ({
      ...item,
      quantity: Number(item.quantity || 0),
      unitPrice: Number(item.unitPrice || 0),
      subtotalAmount: Number(item.subtotalAmount || 0),
      discountAmount: Number(item.discountAmount || 0),
      totalAmount: Number(item.totalAmount || 0),
    })),
    transactions: transactionRows.map((item) => ({
      ...item,
      amount: Number(item.amount || 0),
      balanceBefore: Number(item.balanceBefore || 0),
      balanceAfter: Number(item.balanceAfter || 0),
    })),
  };
});
