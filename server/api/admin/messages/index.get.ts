import { and, desc, eq, like, or, sql, type SQL } from "drizzle-orm";

import { db } from "../../../database";
import { supportConversations } from "../../../database/schema";
import {
  getConversationStatsForUser,
  getSupportRelatedMaps,
  getSupportConversationScopeWhere,
  requireSupportViewPermission,
  type SupportAdminUser,
} from "../../../utils/support-chat";

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event);
  const user = session.user as SupportAdminUser;

  await requireSupportViewPermission(user);

  const query = getQuery(event);
  const search = String(query.search || "").trim();
  const status = String(query.status || "all").trim();
  const assignment = String(query.assignment || "all").trim();
  const page = Math.max(Number(query.page || 1), 1);
  const pageSize = Math.max(Number(query.pageSize || 20), 1);
  const offset = (page - 1) * pageSize;

  try {
    const conditions: SQL[] = [];
    const scopedWhere = getSupportConversationScopeWhere(user);

    if (scopedWhere) {
      conditions.push(scopedWhere);
    }

    if (search) {
      const keyword = `%${search}%`;
      conditions.push(
        or(
          like(supportConversations.conversationCode, keyword),
          like(supportConversations.subject, keyword),
          like(supportConversations.lastMessagePreview, keyword)
        )!
      );
    }

    if (status !== "all") {
      conditions.push(eq(supportConversations.status, status));
    }

    if (assignment === "mine" && user.id) {
      conditions.push(eq(supportConversations.adminUserId, Number(user.id)));
    } else if (assignment === "unassigned") {
      conditions.push(sql`${supportConversations.adminUserId} is null`);
    } else if (assignment === "assigned") {
      conditions.push(sql`${supportConversations.adminUserId} is not null`);
    }

    const whereClause = conditions.length ? and(...conditions) : undefined;

    const [totalRows, conversationRows, stats] = await Promise.all([
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
      getConversationStatsForUser(user),
    ]);

    const { userMap, orderMap } = await getSupportRelatedMaps(conversationRows);

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
