import { and, desc, eq, like, or, sql, type SQL } from "drizzle-orm";
import type { User } from "#auth-utils";

import { db } from "../../../database";
import {
  flashSaleItems,
  flashSales,
  plans,
  products,
} from "../../../database/schema";
import {
  hasAnyAdminPermission,
  requireAdminAccess,
  type AdminSessionUser,
} from "../../../utils/admin-permissions";

interface AdminUser extends User, AdminSessionUser {}

const getEffectiveStatus = (
  status?: string | null,
  startAt?: Date | string | null,
  endAt?: Date | string | null
) => {
  const now = Date.now();
  const startTime = startAt ? new Date(startAt).getTime() : null;
  const endTime = endAt ? new Date(endAt).getTime() : null;

  if (endTime && !Number.isNaN(endTime) && endTime < now) {
    return "ended";
  }

  if (status === "paused") {
    return "paused";
  }

  if (startTime && !Number.isNaN(startTime) && startTime > now) {
    return "upcoming";
  }

  if (status === "running" || status === "upcoming") {
    return status;
  }

  return "upcoming";
};

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event);
  const user = session.user as AdminUser;

  requireAdminAccess(user);

  const allowed = await hasAnyAdminPermission(user, [
    "view_flash_sales",
    "manage_flash_sales",
  ]);

  if (!allowed) {
    throw createError({
      statusCode: 403,
      message: "Bạn không có quyền xem flash sale",
    });
  }

  const query = getQuery(event);
  const search = String(query.search || "").trim();
  const status = String(query.status || "all").trim();

  try {
    const conditions: SQL[] = [];

    if (search) {
      const keyword = `%${search}%`;
      conditions.push(
        or(
          like(flashSales.name, keyword),
          like(products.name, keyword),
          like(plans.name, keyword),
          sql`CAST(${flashSales.id} AS CHAR) LIKE ${keyword}`
        )!
      );
    }

    const rows = await db
      .select({
        id: flashSales.id,
        name: flashSales.name,
        itemId: flashSaleItems.id,
        productId: flashSaleItems.productId,
        planId: flashSaleItems.planId,
        productName: products.name,
        planName: plans.name,
        discountType: flashSaleItems.discountType,
        discountValue: flashSaleItems.discountValue,
        maxDiscount: flashSaleItems.maxDiscount,
        startAt: flashSales.startAt,
        endAt: flashSales.endAt,
        status: flashSales.status,
        quantityLimit: flashSaleItems.quantityLimit,
        soldCount: flashSaleItems.soldCount,
        maxPerUser: flashSaleItems.maxPerUser,
        note: flashSales.note,
        createdAt: flashSales.createdAt,
        updatedAt: flashSales.updatedAt,
      })
      .from(flashSales)
      .leftJoin(flashSaleItems, eq(flashSaleItems.flashSaleId, flashSales.id))
      .leftJoin(products, eq(flashSaleItems.productId, products.id))
      .leftJoin(plans, eq(flashSaleItems.planId, plans.id))
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(flashSales.id), desc(flashSaleItems.id));

    const grouped = new Map<
      number,
      {
        id: number;
        name: string;
        productId: number | null;
        planId: number | null;
        product: string;
        plan: string | null;
        discountType: string;
        discountValue: number;
        maxDiscount: number | null;
        startAt: Date | string | null;
        endAt: Date | string | null;
        status: string;
        quantityLimit: number;
        soldCount: number;
        maxPerUser: number;
        note: string | null;
        createdAt: Date | string | null;
        updatedAt: Date | string | null;
        itemCount: number;
      }
    >();

    for (const row of rows) {
      const flashSaleId = Number(row.id);
      const existing = grouped.get(flashSaleId);

      if (!existing) {
        grouped.set(flashSaleId, {
          id: flashSaleId,
          name: row.name,
          productId: row.productId ? Number(row.productId) : null,
          planId: row.planId ? Number(row.planId) : null,
          product: row.productName || "Sản phẩm đã xóa",
          plan: row.planName || null,
          discountType: String(row.discountType || "percent"),
          discountValue: Number(row.discountValue || 0),
          maxDiscount: row.maxDiscount ? Number(row.maxDiscount) : null,
          startAt: row.startAt,
          endAt: row.endAt,
          status: String(row.status || "upcoming"),
          quantityLimit: Number(row.quantityLimit || 0),
          soldCount: Number(row.soldCount || 0),
          maxPerUser: Number(row.maxPerUser || 1),
          note: row.note || null,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
          itemCount: row.itemId ? 1 : 0,
        });
        continue;
      }

      existing.itemCount += row.itemId ? 1 : 0;
      existing.quantityLimit += Number(row.quantityLimit || 0);
      existing.soldCount += Number(row.soldCount || 0);
    }

    const items = [...grouped.values()]
      .map((item) => ({
        ...item,
        status: getEffectiveStatus(item.status, item.startAt, item.endAt),
      }))
      .filter((item) => status === "all" || item.status === status);

    const stats = {
      total: items.length,
      running: items.filter((item) => item.status === "running").length,
      upcoming: items.filter((item) => item.status === "upcoming").length,
      totalSold: items.reduce((sum, item) => sum + Number(item.soldCount || 0), 0),
    };

    return {
      items,
      stats,
    };
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      message: error?.message || "Lỗi hệ thống khi lấy danh sách flash sale",
    });
  }
});
