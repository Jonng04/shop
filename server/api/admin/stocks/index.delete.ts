import { eq } from "drizzle-orm";
import { db } from "../../../database";
import { plans, stocks } from "../../../database/schema";
import type { User } from "#auth-utils";
import { createActivityLog, getRequestContextMeta } from "../../../utils/activity-log";
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
  await requireAdminPermission(user, "manage_stocks");

  const query = getQuery(event);
  const planId = query.planId ? Number(query.planId) : null;
  const id = query.id ? Number(query.id) : null;

  try {
    if (id) {
      const stock = await db.query.stocks.findFirst({
        where: eq(stocks.id, id),
      });

      if (!stock) {
        throw createError({ statusCode: 404, message: "Stock không tồn tại" });
      }

      const plan = await db.query.plans.findFirst({
        where: eq(plans.id, Number(stock.planId)),
        columns: {
          id: true,
          name: true,
          deliveryType: true,
        },
      });

      if (!plan) {
        throw createError({
          statusCode: 404,
          message: "Gói sản phẩm không tồn tại",
        });
      }

      if (plan.deliveryType !== "instant") {
        throw createError({
          statusCode: 400,
          message: "Chỉ gói giao ngay mới có kho hàng",
        });
      }

      await db.delete(stocks).where(eq(stocks.id, id));

      const context = getRequestContextMeta(event);
      await createActivityLog({
        actorUserId: Number(user.id || 0) || null,
        actorName: user.username || user.name || "Admin",
        actorEmail: user.email || null,
        actorRole: "admin",
        action: "Xóa stock",
        module: "Kho hàng",
        target: `STOCK-${id}`,
        description: `Đã xóa stock #${id}`,
        level: "critical",
        ip: context.ip,
        device: context.device,
        metadata: {
          stockId: id,
          planId: stock.planId,
          status: stock.status,
          contentPreview: stock.content?.slice(0, 80) || null,
        },
      });
    } else if (planId) {
      const plan = await db.query.plans.findFirst({
        where: eq(plans.id, planId),
        columns: {
          id: true,
          name: true,
          deliveryType: true,
        },
      });

      if (!plan) {
        throw createError({
          statusCode: 404,
          message: "Gói sản phẩm không tồn tại",
        });
      }

      if (plan.deliveryType !== "instant") {
        throw createError({
          statusCode: 400,
          message: "Chỉ gói giao ngay mới có kho hàng",
        });
      }

      const stockList = await db.select().from(stocks).where(eq(stocks.planId, planId));

      await db.delete(stocks).where(eq(stocks.planId, planId));

      const context = getRequestContextMeta(event);
      await createActivityLog({
        actorUserId: Number(user.id || 0) || null,
        actorName: user.username || user.name || "Admin",
        actorEmail: user.email || null,
        actorRole: "admin",
        action: "Xóa toàn bộ stock của plan",
        module: "Kho hàng",
        target: plan?.name || `PLAN-${planId}`,
        description: `Đã xóa ${stockList.length} stock của plan #${planId}`,
        level: "critical",
        ip: context.ip,
        device: context.device,
        metadata: {
          planId,
          planName: plan?.name || null,
          deletedCount: stockList.length,
        },
      });
    } else {
      throw createError({ statusCode: 400, message: "Thiếu ID hoặc planId" });
    }

    return { success: true };
  } catch (err: any) {
    throw createError({ statusCode: err.statusCode || 500, message: err.message });
  }
});
