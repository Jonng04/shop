import { db } from "../../../database";
import { plans, stocks } from "../../../database/schema";
import { eq } from "drizzle-orm";
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

  const { planId, contentLines } = await readBody(event);
  if (!planId || !contentLines || !Array.isArray(contentLines)) {
    throw createError({ statusCode: 400, message: "Thiếu dữ liệu bắt buộc" });
  }

  const newStocks = contentLines
    .filter((line: string) => line.trim())
    .map((line: string) => ({
      planId: Number(planId),
      content: line.trim(),
      status: "available",
      createdAt: new Date(),
    }));

  if (newStocks.length === 0) return { success: true, count: 0 };

  try {
    const plan = await db.query.plans.findFirst({
      where: eq(plans.id, Number(planId)),
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
        message: "Chỉ gói giao ngay mới được nhập kho",
      });
    }

    await db.insert(stocks).values(newStocks);

    const context = getRequestContextMeta(event);
    await createActivityLog({
      actorUserId: Number(user.id || 0) || null,
      actorName: user.username || user.name || "Admin",
      actorEmail: user.email || null,
      actorRole: "admin",
      action: "Nhập stock",
      module: "Kho hàng",
      target: plan?.name || `PLAN-${planId}`,
      description: `Đã nhập ${newStocks.length} stock cho plan #${planId}`,
      level: "success",
      ip: context.ip,
      device: context.device,
      metadata: {
        planId: Number(planId),
        planName: plan?.name || null,
        importedCount: newStocks.length,
        preview: newStocks.slice(0, 3).map((item) => item.content),
      },
    });

    return { success: true, count: newStocks.length };
  } catch (err: any) {
    throw createError({ statusCode: 500, message: err.message });
  }
});
