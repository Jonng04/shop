import { eq, sql } from "drizzle-orm";
import type { User } from "#auth-utils";

import { db } from "../../../../database";
import {
  affiliateCommissions,
  affiliateLinks,
} from "../../../../database/schema";
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
    const commission = await db.query.affiliateCommissions.findFirst({
      where: eq(affiliateCommissions.id, Number(id)),
    });

    if (!commission) {
      throw createError({ statusCode: 404, message: "Hoa hồng không tồn tại" });
    }

    const nextStatus = String(body?.status || "").trim();
    const cancelNote = String(body?.note || "").trim();

    if (nextStatus !== "cancelled") {
      throw createError({
        statusCode: 400,
        message: "Chỉ hỗ trợ hủy hoa hồng ở endpoint này",
      });
    }

    if (String(commission.status) === "cancelled") {
      throw createError({
        statusCode: 400,
        message: "Hoa hồng đã bị hủy trước đó",
      });
    }

    if (!cancelNote) {
      throw createError({
        statusCode: 400,
        message: "Vui lòng nhập ghi chú lý do hủy",
      });
    }

    await db.transaction(async (tx) => {
      await tx
        .update(affiliateCommissions)
        .set({
          status: "cancelled",
          note: cancelNote,
        })
        .where(eq(affiliateCommissions.id, Number(id)));

      const commissionAmount = Number(commission.commissionAmount || 0);
      await tx
        .update(affiliateLinks)
        .set({
          totalOrders: sql`GREATEST(${affiliateLinks.totalOrders} - 1, 0)`,
          totalEarned: sql`GREATEST(${affiliateLinks.totalEarned} - ${commissionAmount}, 0)`,
          pendingBalance: sql`GREATEST(${affiliateLinks.pendingBalance} - ${commissionAmount}, 0)`,
        })
        .where(eq(affiliateLinks.userId, Number(commission.affiliateUserId)));
    });

    // Get updated record
    const updatedRecord = await db.query.affiliateCommissions.findFirst({
      where: eq(affiliateCommissions.id, Number(id)),
    });

    return {
      success: true,
      message: "Cập nhật hoa hồng thành công",
      data: updatedRecord,
    };
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      message: error?.message || "Có lỗi xảy ra khi cập nhật hoa hồng",
    });
  }
});
