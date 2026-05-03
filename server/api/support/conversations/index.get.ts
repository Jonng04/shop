import { and, desc, eq, sql, type SQL } from "drizzle-orm";

import { db } from "../../../database";
import { supportConversations } from "../../../database/schema";
import {
  getSupportRelatedMaps,
  requireSupportCustomer,
  type SupportCustomerUser,
} from "../../../utils/support-chat";

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event);
  const user = session.user as SupportCustomerUser;

  requireSupportCustomer(user);

  const query = getQuery(event);
  const status = String(query.status || "all").trim();
  const page = Math.max(Number(query.page || 1), 1);
  const pageSize = Math.max(Number(query.pageSize || 20), 1);
  const offset = (page - 1) * pageSize;

  try {
    const conditions: SQL[] = [
      eq(supportConversations.customerUserId, Number(user.id)),
    ];

    if (status !== "all") {
      conditions.push(eq(supportConversations.status, status));
    }

    const whereClause = and(...conditions);

    const [totalRows, conversationRows] = await Promise.all([
      db
        .select({ count: sql<number>`count(*)` })
        .from(supportConversations)
        .where(whereClause),
      db
        .select()
        .from(supportConversations)
        .where(whereClause)
        .orderBy(
          desc(supportConversations.lastMessageAt),
          desc(supportConversations.id)
        )
        .limit(pageSize)
        .offset(offset),
    ]);

    const { userMap, orderMap } = await getSupportRelatedMaps(conversationRows, {
      customerScopedOrderUserId: Number(user.id),
    });

    const items = conversationRows.map((conversation) => ({
      id: conversation.id,
      conversationCode: conversation.conversationCode,
      status: conversation.status,
      priority: conversation.priority,
      source: conversation.source,
      subject: conversation.subject,
      tags: conversation.tags,
      lastMessageId: conversation.lastMessageId,
      lastMessagePreview: conversation.lastMessagePreview,
      lastMessageSenderRole: conversation.lastMessageSenderRole,
      lastMessageAt: conversation.lastMessageAt,
      adminUnreadCount: Number(conversation.adminUnreadCount || 0),
      customerUnreadCount: Number(conversation.customerUnreadCount || 0),
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
      assignedAt: conversation.assignedAt,
      firstResponseAt: conversation.firstResponseAt,
      resolvedAt: conversation.resolvedAt,
      closedAt: conversation.closedAt,
      customer: userMap.get(Number(conversation.customerUserId)) || null,
      admin: conversation.adminUserId
        ? userMap.get(Number(conversation.adminUserId)) || null
        : null,
      assignedBy: conversation.assignedByUserId
        ? userMap.get(Number(conversation.assignedByUserId)) || null
        : null,
      order: conversation.orderId
        ? orderMap.get(Number(conversation.orderId)) || null
        : null,
    }));

    const stats = items.reduce(
      (result, item) => {
        if (item.status === "active") {
          result.active += 1;
        } else if (item.status === "resolved") {
          result.resolved += 1;
        } else if (item.status === "closed") {
          result.closed += 1;
        } else {
          result.waiting += 1;
        }

        result.totalUnread += Number(item.customerUnreadCount || 0);
        return result;
      },
      {
        active: 0,
        waiting: 0,
        resolved: 0,
        closed: 0,
        totalUnread: 0,
      }
    );

    return {
      items,
      stats,
      pagination: {
        total: Number(totalRows[0]?.count || 0),
        page,
        pageSize,
      },
    };
  } catch (error: any) {
    throw createError({
      statusCode: error?.statusCode || 500,
      message: error?.message || "Không thể lấy danh sách hội thoại hỗ trợ",
    });
  }
});
