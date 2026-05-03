import { and, eq, sql } from "drizzle-orm";
import type { User } from "#auth-utils";

import { db } from "../../../database";
import { parseBusinessDateTimeInput } from "../../../../shared/timezone";
import {
  flashSaleItems,
  flashSales,
  plans,
  products,
} from "../../../database/schema";
import {
  createActivityLog,
  getRequestContextMeta,
} from "../../../utils/activity-log";
import {
  requireAdminPermission,
  type AdminSessionUser,
} from "../../../utils/admin-permissions";

interface AdminUser extends User, AdminSessionUser {
  id?: number;
  username?: string;
  email?: string;
  name?: string;
}

type FlashSaleItemInput = {
  productId: number;
  planId: number | null;
};

const getInitialFlashSaleStatus = (
  startAt?: Date | null,
  endAt?: Date | null
) => {
  const now = Date.now();
  const startTime = startAt ? startAt.getTime() : null;
  const endTime = endAt ? endAt.getTime() : null;

  if (endTime && !Number.isNaN(endTime) && endTime <= now) {
    return "ended";
  }

  if (startTime && !Number.isNaN(startTime) && startTime > now) {
    return "upcoming";
  }

  return "running";
};

const normalizeFlashSaleItems = (body: any): FlashSaleItemInput[] => {
  const payloadItems = Array.isArray(body?.items) ? body.items : [];

  if (payloadItems.length) {
    const normalized = payloadItems
      .map((item: any) => ({
        productId: Number(item?.productId || 0),
        planId: item?.planId ? Number(item.planId) : null,
      }))
      .filter(
        (item: FlashSaleItemInput) =>
          Number.isFinite(item.productId) &&
          item.productId > 0 &&
          (item.planId === null ||
            (Number.isFinite(item.planId) && item.planId > 0))
      );

    const deduped = new Map<string, FlashSaleItemInput>();

    for (const item of normalized) {
      deduped.set(`${item.productId}:${item.planId ?? "all"}`, item);
    }

    return [...deduped.values()];
  }

  const productId = body?.productId ? Number(body.productId) : 0;
  const planId = body?.planId ? Number(body.planId) : null;

  if (!Number.isFinite(productId) || productId <= 0) {
    return [];
  }

  return [
    {
      productId,
      planId: planId && Number.isFinite(planId) && planId > 0 ? planId : null,
    },
  ];
};

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event);
  const user = session.user as AdminUser;

  await requireAdminPermission(user, "manage_flash_sales");

  const id = Number(getRouterParam(event, "id") || 0);
  if (!id) {
    throw createError({ statusCode: 400, message: "Thieu ID flash sale" });
  }

  const body = await readBody(event);
  const name = String(body.name || "").trim();
  const items = normalizeFlashSaleItems(body);
  const discountType = String(body.discountType || "percent").trim();
  const discountValue = Number(body.discountValue || 0);
  const maxDiscount = body.maxDiscount ? Number(body.maxDiscount) : null;
  const quantityLimit = Number(body.quantityLimit || 0);
  const maxPerUser = Number(body.maxPerUser || 1);
  const parsedStartAt = parseBusinessDateTimeInput(body.startAt);
  const parsedEndAt = parseBusinessDateTimeInput(body.endAt);
  const startAt = parsedStartAt
    ? sql`CAST(${parsedStartAt.dbValue} AS DATETIME)`
    : null;
  const endAt = parsedEndAt
    ? sql`CAST(${parsedEndAt.dbValue} AS DATETIME)`
    : null;
  const startAtDate = parsedStartAt?.dateValue || null;
  const endAtDate = parsedEndAt?.dateValue || null;
  const note = String(body.note || "").trim() || null;

  if (!name) {
    throw createError({
      statusCode: 400,
      message: "Ten flash sale la bat buoc",
    });
  }

  if (!items.length) {
    throw createError({
      statusCode: 400,
      message: "Ban phai chon it nhat mot san pham hoac goi ap dung",
    });
  }

  if (!["percent", "fixed"].includes(discountType)) {
    throw createError({
      statusCode: 400,
      message: "Loai giam gia khong hop le",
    });
  }

  if (!Number.isFinite(discountValue) || discountValue <= 0) {
    throw createError({
      statusCode: 400,
      message: "Gia tri giam phai lon hon 0",
    });
  }

  if (discountType === "percent" && discountValue > 99) {
    throw createError({
      statusCode: 400,
      message: "Phan tram giam gia phai tu 1 den 99",
    });
  }

  if (
    maxDiscount !== null &&
    (!Number.isFinite(maxDiscount) || maxDiscount < 0)
  ) {
    throw createError({
      statusCode: 400,
      message: "Giam toi da phai lon hon hoac bang 0",
    });
  }

  if (!Number.isFinite(quantityLimit) || quantityLimit < 0) {
    throw createError({
      statusCode: 400,
      message: "Gioi han so luong ban phai lon hon hoac bang 0",
    });
  }

  if (!Number.isFinite(maxPerUser) || maxPerUser < 1) {
    throw createError({
      statusCode: 400,
      message: "Gioi han moi nguoi dung phai lon hon hoac bang 1",
    });
  }

  if (body.startAt && !parsedStartAt) {
    throw createError({
      statusCode: 400,
      message: "Ngay bat dau khong hop le",
    });
  }

  if (body.endAt && !parsedEndAt) {
    throw createError({
      statusCode: 400,
      message: "Ngay ket thuc khong hop le",
    });
  }

  if (startAtDate && endAtDate && startAtDate >= endAtDate) {
    throw createError({
      statusCode: 400,
      message: "Ngay bat dau phai truoc ngay ket thuc",
    });
  }

  const existing = await db.query.flashSales.findFirst({
    where: eq(flashSales.id, id),
  });

  if (!existing) {
    throw createError({ statusCode: 404, message: "Flash sale khong ton tai" });
  }

  const existingItems = await db.query.flashSaleItems.findMany({
    where: eq(flashSaleItems.flashSaleId, id),
  });

  if (!existingItems.length) {
    throw createError({
      statusCode: 404,
      message: "Flash sale item khong ton tai",
    });
  }

  for (const item of items) {
    const product = await db.query.products.findFirst({
      where: eq(products.id, item.productId),
    });

    if (!product) {
      throw createError({ statusCode: 404, message: "San pham khong ton tai" });
    }

    if (!item.planId) {
      continue;
    }

    const plan = await db.query.plans.findFirst({
      where: and(
        eq(plans.id, item.planId),
        eq(plans.productId, item.productId)
      ),
    });

    if (!plan) {
      throw createError({
        statusCode: 404,
        message: "Goi san pham khong ton tai hoac khong thuoc san pham da chon",
      });
    }
  }

  const status =
    existing.status === "paused"
      ? "paused"
      : getInitialFlashSaleStatus(startAtDate, endAtDate);

  await db.transaction(async (tx) => {
    await tx
      .update(flashSales)
      .set({
        name,
        startAt,
        endAt,
        note,
        status,
        updatedBy: Number(user.id || 0) || null,
      })
      .where(eq(flashSales.id, id));

    await tx.delete(flashSaleItems).where(eq(flashSaleItems.flashSaleId, id));

    const soldCountByKey = new Map(
      existingItems.map((item) => [
        `${Number(item.productId)}:${item.planId ? Number(item.planId) : "all"}`,
        Number(item.soldCount || 0),
      ])
    );

    await tx.insert(flashSaleItems).values(
      items.map((item) => ({
        flashSaleId: id,
        productId: item.productId,
        planId: item.planId,
        discountType,
        discountValue,
        maxDiscount,
        quantityLimit,
        soldCount:
          soldCountByKey.get(`${item.productId}:${item.planId ?? "all"}`) || 0,
        maxPerUser,
      }))
    );
  });

  const context = getRequestContextMeta(event);
  await createActivityLog({
    actorUserId: Number(user.id || 0) || null,
    actorName: user.username || user.name || "Admin",
    actorEmail: user.email || null,
    actorRole: "admin",
    action: "Cập nhật flash sale",
    module: "Flash Sale",
    target: existing.name,
    description: `Đã cập nhật flash sale #${id}`,
    level: "warning",
    ip: context.ip,
    device: context.device,
    metadata: {
      flashSaleId: id,
      before: {
        name: existing.name,
        itemCount: existingItems.length,
        items: existingItems.map((item) => ({
          productId: item.productId,
          planId: item.planId,
        })),
      },
      after: {
        name,
        itemCount: items.length,
        items,
        discountType,
        discountValue,
      },
    },
  });

  return { success: true, message: "Cập nhật flash sale thành công" };
});
