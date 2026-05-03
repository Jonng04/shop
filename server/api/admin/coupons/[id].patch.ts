import { and, eq, ne, sql } from "drizzle-orm";
import type { User } from "#auth-utils";

import { db } from "../../../database";
import { coupons } from "../../../database/schema";
import { parseBusinessDateTimeInput } from "../../../../shared/timezone";
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

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event);
  const user = session.user as AdminUser;

  await requireAdminPermission(user, "manage_coupons");

  const id = Number(getRouterParam(event, "id") || 0);
  if (!id) {
    throw createError({
      statusCode: 400,
      message: "Thiếu ID hoặc ID không hợp lệ",
    });
  }

  const body = await readBody(event);

  const code = String(body.code || "")
    .trim()
    .toUpperCase();
  const discountType = String(body.discountType || "percent");
  const discountValue = Number(body.discountValue || 0);
  const maxDiscount = body.maxDiscount ? Number(body.maxDiscount) : null;
  const minOrderValue = body.minOrderValue ? Number(body.minOrderValue) : null;
  const usageLimit = body.usageLimit ? Number(body.usageLimit) : null;
  const maxPerUser = body.maxPerUser ? Number(body.maxPerUser) : null;
  const parsedStartAt = parseBusinessDateTimeInput(body.startAt);
  const parsedExpiryDate = parseBusinessDateTimeInput(body.expiryDate);
  const startAt = parsedStartAt
    ? sql`CAST(${parsedStartAt.dbValue} AS DATETIME)`
    : null;
  const expiryDate = parsedExpiryDate
    ? sql`CAST(${parsedExpiryDate.dbValue} AS DATETIME)`
    : null;
  const startAtDate = parsedStartAt?.dateValue || null;
  const expiryDateDate = parsedExpiryDate?.dateValue || null;
  const description = String(body.description || "").trim() || null;
  const internalNote = String(body.internalNote || "").trim() || null;
  const status = String(body.status || "active").trim() || "active";

  let applicableProductIds: string | null = null;
  let applicableCategoryIds: string | null = null;

  if (
    Array.isArray(body.applicableProductIds) &&
    body.applicableProductIds.length > 0
  ) {
    applicableProductIds = JSON.stringify(
      body.applicableProductIds.filter((value: number) =>
        Number.isFinite(value)
      )
    );
  }

  if (
    Array.isArray(body.applicableCategoryIds) &&
    body.applicableCategoryIds.length > 0
  ) {
    applicableCategoryIds = JSON.stringify(
      body.applicableCategoryIds.filter((value: number) =>
        Number.isFinite(value)
      )
    );
  }

  if (code.length < 4) {
    throw createError({
      statusCode: 400,
      message: "Mã giảm giá phải có ít nhất 4 ký tự",
    });
  }

  if (!["percent", "fixed"].includes(discountType)) {
    throw createError({
      statusCode: 400,
      message: "Loại giảm giá không hợp lệ",
    });
  }

  if (!["active", "inactive", "paused"].includes(status)) {
    throw createError({
      statusCode: 400,
      message: "Trạng thái mã giảm giá không hợp lệ",
    });
  }

  if (!Number.isFinite(discountValue) || discountValue <= 0) {
    throw createError({
      statusCode: 400,
      message: "Giá trị giảm giá phải lớn hơn 0",
    });
  }

  if (discountType === "percent" && discountValue > 100) {
    throw createError({
      statusCode: 400,
      message: "Phần trăm giảm giá không được vượt quá 100%",
    });
  }

  if (maxDiscount !== null && maxDiscount < 0) {
    throw createError({ statusCode: 400, message: "Giảm tối đa phải ≥ 0" });
  }

  if (minOrderValue !== null && minOrderValue < 0) {
    throw createError({
      statusCode: 400,
      message: "Giá trị đơn tối thiểu phải ≥ 0",
    });
  }

  if (usageLimit !== null && usageLimit < 1) {
    throw createError({
      statusCode: 400,
      message: "Giới hạn sử dụng phải ≥ 1",
    });
  }

  if (maxPerUser !== null && maxPerUser < 1) {
    throw createError({
      statusCode: 400,
      message: "Tối đa dùng/người phải ≥ 1",
    });
  }

  if (body.startAt && !parsedStartAt) {
    throw createError({
      statusCode: 400,
      message: "Ngày bắt đầu không hợp lệ",
    });
  }

  if (body.expiryDate && !parsedExpiryDate) {
    throw createError({
      statusCode: 400,
      message: "Ngày hết hạn không hợp lệ",
    });
  }

  if (startAtDate && expiryDateDate && startAtDate >= expiryDateDate) {
    throw createError({
      statusCode: 400,
      message: "Ngày bắt đầu phải trước ngày hết hạn",
    });
  }

  try {
    const existing = await db.query.coupons.findFirst({
      where: eq(coupons.id, id),
    });

    if (!existing) {
      throw createError({
        statusCode: 404,
        message: "Mã giảm giá không tồn tại",
      });
    }

    const duplicate = await db.query.coupons.findFirst({
      where: and(eq(coupons.code, code), ne(coupons.id, id)),
    });

    if (duplicate) {
      throw createError({ statusCode: 409, message: "Mã giảm giá đã tồn tại" });
    }

    await db
      .update(coupons)
      .set({
        code,
        discountValue,
        discountType,
        maxDiscount,
        minOrderValue,
        applicableProductIds,
        applicableCategoryIds,
        usageLimit,
        maxPerUser,
        startAt,
        expiryDate,
        status,
        description,
        internalNote,
      })
      .where(eq(coupons.id, id));

    const context = getRequestContextMeta(event);
    await createActivityLog({
      actorUserId: Number(user.id || 0) || null,
      actorName: user.username || user.name || "Admin",
      actorEmail: user.email || null,
      actorRole: "admin",
      action: "Cập nhật mã giảm giá",
      module: "Khuyến mãi",
      target: code,
      description: `Đã cập nhật mã giảm giá ${code}`,
      level: "warning",
      ip: context.ip,
      device: context.device,
      metadata: {
        couponId: id,
        before: {
          code: existing.code,
          discountType: existing.discountType,
          discountValue: existing.discountValue,
          startAt: existing.startAt,
          expiryDate: existing.expiryDate,
          status: existing.status,
        },
        after: {
          code,
          discountType,
          discountValue,
          startAt: parsedStartAt?.dbValue || null,
          expiryDate: parsedExpiryDate?.dbValue || null,
          status,
        },
      },
    });

    return { success: true, message: "Đã cập nhật mã giảm giá" };
  } catch (error: any) {
    if (error?.statusCode) throw error;

    throw createError({
      statusCode: 500,
      message: "Lỗi hệ thống khi cập nhật mã giảm giá",
    });
  }
});
