import type { User } from "#auth-utils";
import { and, desc, eq, inArray, or, sql, type SQL } from "drizzle-orm";

import { db } from "../database";
import { orders, supportConversations, users } from "../database/schema";
import {
  ADMIN_PERMISSION_ALL,
  getAdminPermissionsByRoleName,
  hasAnyAdminPermission,
  requireAdminAccess,
  requireAdminPermission,
  type AdminSessionUser,
} from "./admin-permissions";
import { getRequestContextMeta } from "./activity-log";

export interface SupportAdminUser extends User, AdminSessionUser {
  id?: number;
  username?: string;
  email?: string;
  name?: string;
  role?: string;
  permissions?: string[];
}

export interface SupportCustomerUser extends User {
  id?: number;
  username?: string;
  email?: string;
  role?: string;
}

export const requireSupportViewPermission = async (
  user: SupportAdminUser | null | undefined
) => {
  requireAdminAccess(user);

  const allowed = await hasAnyAdminPermission(user, [
    "view_messages",
    "manage_messages",
  ]);

  if (!allowed) {
    throw createError({
      statusCode: 403,
      message: "Bạn không có quyền truy cập hộp thư hỗ trợ",
    });
  }
};

export const requireSupportManagePermission = async (
  user: SupportAdminUser | null | undefined
) => requireAdminPermission(user, "manage_messages");

export const isRootSupportAdmin = (
  userOrRole?: SupportAdminUser | string | null
) =>
  String(typeof userOrRole === "string" ? userOrRole : userOrRole?.role || "")
    .trim()
    .toLowerCase() === "admin";

export const getSupportConversationScopeWhere = (
  user: SupportAdminUser | null | undefined
): SQL | undefined => {
  if (!user?.id || isRootSupportAdmin(user)) {
    return undefined;
  }

  return or(
    eq(supportConversations.adminUserId, Number(user.id)),
    sql`${supportConversations.adminUserId} is null`
  )!;
};

export const canAccessSupportConversation = (
  user: SupportAdminUser | null | undefined,
  conversation?: {
    adminUserId?: number | null;
  } | null
) => {
  if (!user?.id || !conversation) {
    return false;
  }

  if (isRootSupportAdmin(user)) {
    return true;
  }

  const adminUserId = Number(conversation.adminUserId || 0) || null;
  return !adminUserId || adminUserId === Number(user.id);
};

export const assertSupportConversationAccess = (
  user: SupportAdminUser | null | undefined,
  conversation?: {
    adminUserId?: number | null;
  } | null
) => {
  if (!canAccessSupportConversation(user, conversation)) {
    throw createError({
      statusCode: 403,
      message: "Bạn không có quyền xem hội thoại này",
    });
  }
};

export const requireSupportCustomer = (
  user: SupportCustomerUser | null | undefined
) => {
  if (!user?.id) {
    throw createError({
      statusCode: 401,
      message: "Vui lòng đăng nhập để sử dụng chat hỗ trợ",
    });
  }
};

export const parseJsonText = <T = Record<string, unknown>>(
  value?: string | null
): T | null => {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
};

export const stringifyJsonText = (value: unknown) => {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  return JSON.stringify(value);
};

export const normalizeTags = (value: unknown) => {
  if (value === undefined) {
    return undefined;
  }

  if (value === null || value === "") {
    return null;
  }

  if (Array.isArray(value)) {
    const tags = value.map((item) => String(item || "").trim()).filter(Boolean);

    return tags.length ? JSON.stringify(tags) : null;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();

    if (!trimmed) {
      return null;
    }

    return trimmed;
  }

  return JSON.stringify(value);
};

export const buildMessagePreview = (input: {
  content?: string | null;
  messageType?: string | null;
  attachmentsCount?: number;
}) => {
  const content = String(input.content || "").trim();
  const messageType = String(input.messageType || "text").trim();

  if (content) {
    return content.slice(0, 500);
  }

  if (messageType === "image") {
    return "[Hình ảnh]";
  }

  if (messageType === "file") {
    return input.attachmentsCount && input.attachmentsCount > 1
      ? `[${input.attachmentsCount} tệp đính kèm]`
      : "[Tệp đính kèm]";
  }

  if (messageType === "system") {
    return "[Thông báo hệ thống]";
  }

  return "[Tin nhắn]";
};

export const getSupportActor = (
  event: Parameters<typeof getRequestContextMeta>[0],
  user: SupportAdminUser
) => {
  const context = getRequestContextMeta(event);

  return {
    actorUserId: Number(user.id || 0) || null,
    actorName: user.username || user.name || "Admin",
    actorEmail: user.email || null,
    actorRole: String(user.role || "admin"),
    ip: context.ip,
    device: context.device,
  };
};

export const getConversationById = async (conversationId: number) =>
  db.query.supportConversations.findFirst({
    where: eq(supportConversations.id, conversationId),
  });

export const getCustomerConversationById = async (
  conversationId: number,
  customerUserId: number
) =>
  db.query.supportConversations.findFirst({
    where: and(
      eq(supportConversations.id, conversationId),
      eq(supportConversations.customerUserId, customerUserId)
    ),
  });

export const generateSupportConversationCode = async () => {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const conversationCode = Array.from(
      crypto.getRandomValues(new Uint8Array(10)),
      (value) => String(value % 10)
    ).join("");

    const existingConversation = await db.query.supportConversations.findFirst({
      where: eq(supportConversations.conversationCode, conversationCode),
      columns: {
        id: true,
      },
    });

    if (!existingConversation) {
      return conversationCode;
    }
  }

  throw createError({
    statusCode: 500,
    message: "Không thể tạo mã hội thoại hãy thử lại",
  });
};

export const getSupportRelatedMaps = async (
  conversations: Array<{
    customerUserId?: number | null;
    adminUserId?: number | null;
    assignedByUserId?: number | null;
    orderId?: number | null;
  }>,
  options?: {
    customerScopedOrderUserId?: number | null;
  }
) => {
  const userIds = [
    ...new Set(
      conversations
        .flatMap((item) => [
          Number(item.customerUserId || 0),
          Number(item.adminUserId || 0),
          Number(item.assignedByUserId || 0),
        ])
        .filter((id) => id > 0)
    ),
  ];
  const orderIds = [
    ...new Set(
      conversations
        .map((item) => Number(item.orderId || 0))
        .filter((id) => id > 0)
    ),
  ];

  const [userRows, orderRows] = await Promise.all([
    userIds.length
      ? db
          .select({
            id: users.id,
            username: users.username,
            email: users.email,
            role: users.role,
            status: users.status,
          })
          .from(users)
          .where(inArray(users.id, userIds))
      : Promise.resolve([]),
    orderIds.length
      ? db
          .select({
            id: orders.id,
            orderCode: orders.orderCode,
            status: orders.status,
            totalAmount: orders.totalAmount,
          })
          .from(orders)
          .where(
            options?.customerScopedOrderUserId
              ? and(
                  inArray(orders.id, orderIds),
                  eq(orders.userId, Number(options.customerScopedOrderUserId))
                )
              : inArray(orders.id, orderIds)
          )
      : Promise.resolve([]),
  ]);

  return {
    userMap: new Map(userRows.map((item) => [Number(item.id), item])),
    orderMap: new Map(orderRows.map((item) => [Number(item.id), item])),
  };
};

export const getOwnedOrderSummary = async (
  userId: number,
  orderId?: number | null
) => {
  const normalizedOrderId = Number(orderId || 0);

  if (!normalizedOrderId) {
    return null;
  }

  return (
    (await db.query.orders.findFirst({
      where: and(eq(orders.id, normalizedOrderId), eq(orders.userId, userId)),
      columns: {
        id: true,
        orderCode: true,
        status: true,
        totalAmount: true,
      },
    })) || null
  );
};

export const getConversationStats = async () => {
  const rows = await db.query.supportConversations.findMany({
    columns: {
      status: true,
      adminUnreadCount: true,
    },
    where: undefined,
    orderBy: [desc(supportConversations.id)],
  });

  return rows.reduce(
    (stats, item) => {
      const status = String(item.status || "waiting");

      if (status === "active") {
        stats.active += 1;
      } else if (status === "resolved") {
        stats.resolved += 1;
      } else if (status === "closed") {
        stats.closed += 1;
      } else {
        stats.waiting += 1;
      }

      stats.totalUnread += Number(item.adminUnreadCount || 0);
      return stats;
    },
    {
      active: 0,
      waiting: 0,
      resolved: 0,
      closed: 0,
      totalUnread: 0,
    }
  );
};

export const getConversationStatsForUser = async (
  user: SupportAdminUser | null | undefined
) => {
  const whereClause = getSupportConversationScopeWhere(user);
  const rows = await db.query.supportConversations.findMany({
    columns: {
      status: true,
      adminUnreadCount: true,
    },
    where: whereClause,
    orderBy: [desc(supportConversations.id)],
  });

  return rows.reduce(
    (stats, item) => {
      const status = String(item.status || "waiting");

      if (status === "active") {
        stats.active += 1;
      } else if (status === "resolved") {
        stats.resolved += 1;
      } else if (status === "closed") {
        stats.closed += 1;
      } else {
        stats.waiting += 1;
      }

      stats.totalUnread += Number(item.adminUnreadCount || 0);
      return stats;
    },
    {
      active: 0,
      waiting: 0,
      resolved: 0,
      closed: 0,
      totalUnread: 0,
    }
  );
};

export const getScopedSupportAdminRecipientIds = async (
  conversationAdminUserId?: number | null
) => {
  const normalizedAdminUserId = Number(conversationAdminUserId || 0) || null;

  if (normalizedAdminUserId) {
    return [normalizedAdminUserId];
  }

  const rows = await db
    .select({
      id: users.id,
      role: users.role,
    })
    .from(users)
    .where(and(sql`${users.role} is not null`, eq(users.status, "active")));

  const eligibleUsers = await Promise.all(
    rows.map(async (item) => {
      const roleName = String(item.role || "").trim();

      if (!roleName || roleName === "user" || isRootSupportAdmin(roleName)) {
        return null;
      }

      const permissions = await getAdminPermissionsByRoleName(roleName);
      const canViewMessages =
        permissions.includes(ADMIN_PERMISSION_ALL) ||
        permissions.includes("view_messages") ||
        permissions.includes("manage_messages");

      return canViewMessages ? Number(item.id || 0) || null : null;
    })
  );

  return eligibleUsers.filter((item): item is number => Boolean(item));
};
