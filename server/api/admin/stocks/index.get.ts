import { eq, and, like, desc, count } from "drizzle-orm";
import { db } from "../../../database";
import { plans, stocks } from "../../../database/schema";
import type { User } from "#auth-utils";
import {
  hasAnyAdminPermission,
  requireAdminAccess,
  type AdminSessionUser,
} from "../../../utils/admin-permissions";


interface AdminUser extends User, AdminSessionUser {
}

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event);
  const user = session.user as AdminUser;
  requireAdminAccess(user);

  const allowed = await hasAnyAdminPermission(user, ["view_stocks", "manage_stocks"]);

  if (!allowed) {
    throw createError({
      statusCode: 403,
      message: "Bạn không có quyền xem kho hàng",
    });
  }

  const query = getQuery(event);
  const planId = query.planId ? Number(query.planId) : null;
  const search = query.search as string;
  const status = query.status as string;

  try {
    if (planId) {
      const plan = await db.query.plans.findFirst({
        where: eq(plans.id, planId),
        columns: {
          id: true,
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
    }

    const conditions = [];
    if (planId) conditions.push(eq(stocks.planId, planId));
    if (status && status !== "all") conditions.push(eq(stocks.status, status));
    if (search) conditions.push(like(stocks.content, `%${search}%`));

    const finalCondition = conditions.length > 0 ? and(...conditions) : undefined;

    // Fetch stocks
    const data = await db
      .select()
      .from(stocks)
      .where(finalCondition)
      .orderBy(desc(stocks.createdAt));

    // Also fetch stats if planId is provided
    let stats = { total: 0, available: 0, sold: 0 };
    if (planId) {
      const allStocksForPlan = await db
        .select({ status: stocks.status, count: count() })
        .from(stocks)
        .where(eq(stocks.planId, planId))
        .groupBy(stocks.status);

      allStocksForPlan.forEach((s) => {
        stats.total += s.count;
        if (s.status === "available") stats.available = s.count;
        if (s.status === "sold") stats.sold = s.count;
      });
    }

    return {
      stocks: data,
      stats,
    };
  } catch (err: any) {
    throw createError({ statusCode: 500, message: err.message });
  }
});
