import { eq, sql } from "drizzle-orm";
import type { User } from "#auth-utils";

import { db } from "../../../../database";
import {
  affiliateLinks,
  affiliateWithdrawals,
} from "../../../../database/schema";
import {
  requireAdminPermission,
  type AdminSessionUser,
} from "../../../../utils/admin-permissions";

interface AdminUser extends User, AdminSessionUser {
  id?: number;
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
    const withdrawal = await db.query.affiliateWithdrawals.findFirst({
      where: eq(affiliateWithdrawals.id, Number(id)),
    });

    if (!withdrawal) {
      throw createError({
        statusCode: 404,
        message: "Yêu cầu rút tiền không tồn tại",
      });
    }

    const allowedFields = ["status", "adminNote"] as const;
    const updateData: Record<string, unknown> = {};

    for (const key of allowedFields) {
      if (body[key] !== undefined) {
        updateData[key] = body[key];
      }
    }

    // Validate status transition
    if (updateData.status !== undefined) {
      const newStatus = String(updateData.status);
      const currentStatus = String(withdrawal.status || "");
      const validStatuses = ["pending", "approved", "completed", "rejected"];

      if (!validStatuses.includes(newStatus)) {
        throw createError({
          statusCode: 400,
          message: "Trạng thái không hợp lệ",
        });
      }

      // Validate status flow
      const validTransitions: Record<string, string[]> = {
        pending: ["approved", "rejected"],
        approved: ["completed", "rejected"],
        completed: [],
        rejected: [],
      };

      const allowedTransitions = validTransitions[currentStatus] || [];
      if (!allowedTransitions.includes(newStatus)) {
        throw createError({
          statusCode: 400,
          message: `Không thể chuyển từ ${currentStatus} sang ${newStatus}`,
        });
      }

      // Set timestamps and reviewer info
      if (newStatus === "approved") {
        updateData.reviewedAt = sql`NOW()`;
        updateData.reviewedBy = adminUser.id;
      } else if (newStatus === "completed") {
        updateData.completedAt = sql`NOW()`;
      }
    }

    await db.transaction(async (tx) => {
      await tx
        .update(affiliateWithdrawals)
        .set(updateData)
        .where(eq(affiliateWithdrawals.id, Number(id)));

      if (updateData.status === "completed") {
        await tx
          .update(affiliateLinks)
          .set({
            pendingBalance: sql`GREATEST(${affiliateLinks.pendingBalance} - ${Number(withdrawal.amount || 0)}, 0)`,
          })
          .where(eq(affiliateLinks.userId, Number(withdrawal.userId)));
      }
    });

    // Get updated record
    const updatedRecord = await db.query.affiliateWithdrawals.findFirst({
      where: eq(affiliateWithdrawals.id, Number(id)),
    });

    return {
      success: true,
      message: "Cập nhật yêu cầu rút tiền thành công",
      data: updatedRecord,
    };
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      message: error?.message || "Có lỗi xảy ra khi cập nhật yêu cầu rút tiền",
    });
  }
});
