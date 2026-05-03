import { eq } from "drizzle-orm";
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

  const id = Number(getRouterParam(event, "id") || 0);

  if (!id) {
    throw createError({ statusCode: 400, message: "Thiếu ID flash sale" });
  }

  const records = await db
    .select({
      flashSale: flashSales,
      flashSaleItem: flashSaleItems,
      product: products,
      plan: plans,
    })
    .from(flashSales)
    .leftJoin(flashSaleItems, eq(flashSaleItems.flashSaleId, flashSales.id))
    .leftJoin(products, eq(flashSaleItems.productId, products.id))
    .leftJoin(plans, eq(flashSaleItems.planId, plans.id))
    .where(eq(flashSales.id, id))
    .limit(20);

  const [record] = records;

  if (!record?.flashSale || !record?.flashSaleItem) {
    throw createError({
      statusCode: 404,
      message: "Không tìm thấy flash sale",
    });
  }

  const items = records
    .filter((entry) => entry.flashSaleItem)
    .map((entry) => ({
      id: Number(entry.flashSaleItem!.id || 0),
      flashSaleId: Number(entry.flashSaleItem!.flashSaleId || 0),
      productId: entry.flashSaleItem!.productId
        ? Number(entry.flashSaleItem!.productId)
        : null,
      planId: entry.flashSaleItem!.planId ? Number(entry.flashSaleItem!.planId) : null,
      productName: entry.product?.name || null,
      planName: entry.plan?.name || null,
      discountType: String(entry.flashSaleItem!.discountType || "percent"),
      discountValue: Number(entry.flashSaleItem!.discountValue || 0),
      maxDiscount: entry.flashSaleItem!.maxDiscount
        ? Number(entry.flashSaleItem!.maxDiscount)
        : null,
      quantityLimit: Number(entry.flashSaleItem!.quantityLimit || 0),
      soldCount: Number(entry.flashSaleItem!.soldCount || 0),
      maxPerUser: Number(entry.flashSaleItem!.maxPerUser || 1),
    }));

  return {
    ...record.flashSale,
    itemId: Number(record.flashSaleItem.id || 0),
    productId: record.flashSaleItem.productId
      ? Number(record.flashSaleItem.productId)
      : null,
    planId: record.flashSaleItem.planId ? Number(record.flashSaleItem.planId) : null,
    discountType: String(record.flashSaleItem.discountType || "percent"),
    discountValue: Number(record.flashSaleItem.discountValue || 0),
    maxDiscount: record.flashSaleItem.maxDiscount
      ? Number(record.flashSaleItem.maxDiscount)
      : null,
    quantityLimit: Number(record.flashSaleItem.quantityLimit || 0),
    soldCount: Number(record.flashSaleItem.soldCount || 0),
    maxPerUser: Number(record.flashSaleItem.maxPerUser || 1),
    productName: record.product?.name || null,
    planName: record.plan?.name || null,
    items,
  };
});
