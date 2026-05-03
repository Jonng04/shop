import { eq } from "drizzle-orm";
import type { User } from "#auth-utils";

import { db } from "../../../database";
import { flashSaleItems, flashSales } from "../../../database/schema";
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

  await requireAdminPermission(user, "manage_flash_sales");

  const id = Number(getRouterParam(event, "id") || 0);
  if (!id) {
    throw createError({ statusCode: 400, message: "Thiếu ID flash sale" });
  }

  const existing = await db.query.flashSales.findFirst({
    where: eq(flashSales.id, id),
  });

  if (!existing) {
    throw createError({ statusCode: 404, message: "Flash sale không tồn tại" });
  }

  const existingItem = await db.query.flashSaleItems.findFirst({
    where: eq(flashSaleItems.flashSaleId, id),
  });

  await db.transaction(async (tx) => {
    await tx.delete(flashSaleItems).where(eq(flashSaleItems.flashSaleId, id));
    await tx.delete(flashSales).where(eq(flashSales.id, id));
  });

  const context = getRequestContextMeta(event);
  await createActivityLog({
    actorUserId: Number(user.id || 0) || null,
    actorName: user.username || user.name || "Admin",
    actorEmail: user.email || null,
    actorRole: "admin",
    action: "Xóa flash sale",
    module: "Flash Sale",
    target: existing.name,
    description: `Đã xóa flash sale #${id}`,
    level: "critical",
    ip: context.ip,
    device: context.device,
    metadata: {
      flashSaleId: id,
      name: existing.name,
      productId: existingItem?.productId || null,
      planId: existingItem?.planId || null,
    },
  });

  return { success: true, message: "Đã xóa flash sale" };
});
