import { eq } from "drizzle-orm";
import type { User } from "#auth-utils";

import { db } from "../../../../database";
import { affiliateLinks } from "../../../../database/schema";
import {
  requireAdminPermission,
  type AdminSessionUser,
} from "../../../../utils/admin-permissions";

interface AdminUser extends User, AdminSessionUser {
  username?: string;
}

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event);
  const adminUser = session.user as AdminUser;

  await requireAdminPermission(adminUser, "manage_affiliates");

  const id = getRouterParam(event, "id");
  const body = await readBody(event);

  if (!id) {
    throw createError({ statusCode: 400, message: "Thiếu ID" });
  }

  try {
    const link = await db.query.affiliateLinks.findFirst({
      where: eq(affiliateLinks.id, Number(id)),
    });

    if (!link) {
      throw createError({
        statusCode: 404,
        message: "Affiliate không tồn tại",
      });
    }

    const allowedFields = ["status", "commissionRate"] as const;
    const updateData: Record<string, unknown> = {};

    for (const key of allowedFields) {
      if (body[key] !== undefined) {
        updateData[key] = body[key];
      }
    }

    // Validate commission rate
    if (updateData.commissionRate !== undefined) {
      const rate = Number(updateData.commissionRate);
      if (isNaN(rate) || rate < 0 || rate > 100) {
        throw createError({
          statusCode: 400,
          message: "Tỷ lệ commission phải từ 0 đến 100",
        });
      }
    }

    // Validate status
    if (updateData.status !== undefined) {
      const validStatuses = ["active", "paused"];
      if (!validStatuses.includes(String(updateData.status))) {
        throw createError({
          statusCode: 400,
          message: "Trạng thái không hợp lệ. Chỉ chấp nhận: active, paused",
        });
      }
    }

    // Update record
    const updated = await db
      .update(affiliateLinks)
      .set(updateData)
      .where(eq(affiliateLinks.id, Number(id)));

    // Get updated record
    const updatedRecord = await db.query.affiliateLinks.findFirst({
      where: eq(affiliateLinks.id, Number(id)),
    });

    return {
      success: true,
      message: "Cập nhật affiliate thành công",
      data: updatedRecord,
    };
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      message: error?.message || "Có lỗi xảy ra khi cập nhật affiliate",
    });
  }
});
