import { eq, sql } from "drizzle-orm";

import { db } from "../database";
import {
  affiliateCommissions,
  affiliateLinks,
  orders,
  settings,
  users,
} from "../database/schema";

interface DbLike {
  query: typeof db.query;
  update: typeof db.update;
  insert: typeof db.insert;
}

export async function processAffiliateCommissionForOrder(
  tx: DbLike,
  orderId: number
) {
  const affiliateEnabledRow = await tx.query.settings.findFirst({
    where: eq(settings.key, "affiliateEnabled"),
    columns: { value: true },
  });
  const affiliateRequireActiveRow = await tx.query.settings.findFirst({
    where: eq(settings.key, "affiliateRequireActiveLink"),
    columns: { value: true },
  });
  const affiliateRateRow = await tx.query.settings.findFirst({
    where: eq(settings.key, "affiliateCommissionRate"),
    columns: { value: true },
  });

  const isAffiliateEnabled =
    String(affiliateEnabledRow?.value || "true")
      .trim()
      .toLowerCase() !== "false";
  if (!isAffiliateEnabled) {
    return { created: false, reason: "affiliate_disabled" as const };
  }

  const requireActiveLink =
    String(affiliateRequireActiveRow?.value || "true")
      .trim()
      .toLowerCase() !== "false";
  const defaultCommissionRate = Math.max(
    0,
    Math.min(100, Number(affiliateRateRow?.value || 10) || 10)
  );

  const orderRow = await tx.query.orders.findFirst({
    where: eq(orders.id, orderId),
    columns: {
      id: true,
      userId: true,
      totalAmount: true,
      status: true,
      fulfillmentStatus: true,
      affiliateCommissionId: true,
    },
  });

  if (!orderRow?.id || !orderRow.userId) {
    return { created: false, reason: "order_not_found" as const };
  }

  if (
    orderRow.status !== "completed" ||
    orderRow.fulfillmentStatus !== "delivered"
  ) {
    return { created: false, reason: "order_not_completed" as const };
  }

  if (orderRow.affiliateCommissionId) {
    return { created: false, reason: "already_linked" as const };
  }

  const existingCommission = await tx.query.affiliateCommissions.findFirst({
    where: eq(affiliateCommissions.orderId, orderRow.id),
    columns: { id: true },
  });

  if (existingCommission?.id) {
    await tx
      .update(orders)
      .set({ affiliateCommissionId: existingCommission.id })
      .where(eq(orders.id, orderRow.id));

    return {
      created: false,
      reason: "commission_exists" as const,
      commissionId: existingCommission.id,
    };
  }

  const buyer = await tx.query.users.findFirst({
    where: eq(users.id, orderRow.userId),
    columns: {
      id: true,
      referredByRefCode: true,
    },
  });

  const refCode = String(buyer?.referredByRefCode || "").trim();
  if (!refCode) {
    return { created: false, reason: "no_ref_code" as const };
  }

  const affiliateLink = await tx.query.affiliateLinks.findFirst({
    where: eq(affiliateLinks.refCode, refCode),
    columns: {
      id: true,
      userId: true,
      status: true,
      commissionRate: true,
    },
  });

  if (!affiliateLink?.id) {
    return { created: false, reason: "invalid_affiliate_link" as const };
  }

  if (requireActiveLink && affiliateLink.status !== "active") {
    return { created: false, reason: "inactive_affiliate_link" as const };
  }

  if (affiliateLink.userId === orderRow.userId) {
    return { created: false, reason: "self_referral" as const };
  }

  const commissionRate = Number(
    affiliateLink.commissionRate ?? defaultCommissionRate
  );
  const orderAmount = Number(orderRow.totalAmount ?? 0);
  const commissionAmount = Math.floor((orderAmount * commissionRate) / 100);

  if (commissionAmount <= 0) {
    return { created: false, reason: "zero_commission" as const };
  }

  const insertedCommission = await tx
    .insert(affiliateCommissions)
    .values({
      affiliateUserId: affiliateLink.userId,
      referredUserId: orderRow.userId,
      orderId: orderRow.id,
      affiliateLinkId: affiliateLink.id,
      commissionRate,
      orderAmount,
      commissionAmount,
      status: "paid",
    })
    .$returningId();

  const commissionId = insertedCommission[0]?.id;
  if (!commissionId) {
    return { created: false, reason: "insert_failed" as const };
  }

  await tx
    .update(affiliateLinks)
    .set({
      totalOrders: sql`${affiliateLinks.totalOrders} + 1`,
      totalEarned: sql`${affiliateLinks.totalEarned} + ${commissionAmount}`,
      pendingBalance: sql`${affiliateLinks.pendingBalance} + ${commissionAmount}`,
    })
    .where(eq(affiliateLinks.id, affiliateLink.id));

  await tx
    .update(orders)
    .set({ affiliateCommissionId: commissionId })
    .where(eq(orders.id, orderRow.id));

  return {
    created: true,
    reason: "created" as const,
    commissionId,
    commissionAmount,
  };
}
