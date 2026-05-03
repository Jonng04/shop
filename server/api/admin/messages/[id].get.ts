import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";

import { db } from "../../../database";
import {
  supportMessageAttachments,
  supportMessages,
  users,
} from "../../../database/schema";
import {
  assertSupportConversationAccess,
  getConversationById,
  getSupportRelatedMaps,
  parseJsonText,
  requireSupportViewPermission,
  type SupportAdminUser,
} from "../../../utils/support-chat";

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event);
  const user = session.user as SupportAdminUser;

  await requireSupportViewPermission(user);

  const id = Number(getRouterParam(event, "id") || 0);
  const query = getQuery(event);
  const page = Math.max(Number(query.page || 1), 1);
  const pageSize = Math.max(Number(query.pageSize || 50), 1);
  const offset = (page - 1) * pageSize;

  if (!Number.isInteger(id) || id <= 0) {
    throw createError({
      statusCode: 400,
      message: "ID hội thoại không hợp lệ",
    });
  }

  try {
    const conversation = await getConversationById(id);

    if (!conversation) {
      throw createError({
        statusCode: 404,
        message: "Hội thoại không tồn tại",
      });
    }

    assertSupportConversationAccess(user, conversation);

    const [messageTotalRows, messageRows, relatedMaps] = await Promise.all([
      db
        .select({ count: sql<number>`count(*)` })
        .from(supportMessages)
        .where(eq(supportMessages.conversationId, id)),
      db
        .select()
        .from(supportMessages)
        .where(eq(supportMessages.conversationId, id))
        .orderBy(desc(supportMessages.createdAt), desc(supportMessages.id))
        .limit(pageSize)
        .offset(offset),
      getSupportRelatedMaps([conversation]),
    ]);

    const orderedMessages = [...messageRows].reverse();
    const messageIds = orderedMessages.map((item) => Number(item.id)).filter(Boolean);
    const senderIds = [...new Set(
      orderedMessages
        .map((item) => Number(item.senderUserId || 0))
        .filter((senderId) => senderId > 0)
    )];

    const [attachmentRows, senderRows] = await Promise.all([
      messageIds.length
        ? db
            .select()
            .from(supportMessageAttachments)
            .where(inArray(supportMessageAttachments.messageId, messageIds))
            .orderBy(
              asc(supportMessageAttachments.messageId),
              asc(supportMessageAttachments.id)
            )
        : Promise.resolve([]),
      senderIds.length
        ? db
            .select({
              id: users.id,
              username: users.username,
              email: users.email,
              role: users.role,
              status: users.status,
            })
            .from(users)
            .where(inArray(users.id, senderIds))
        : Promise.resolve([]),
    ]);

    const senderMap = new Map(senderRows.map((item) => [Number(item.id), item]));
    const attachmentMap = new Map<number, typeof attachmentRows>();

    for (const attachment of attachmentRows) {
      const messageId = Number(attachment.messageId);
      const current = attachmentMap.get(messageId) || [];
      current.push(attachment);
      attachmentMap.set(messageId, current);
    }

    return {
      conversation: {
        ...conversation,
        adminUnreadCount: Number(conversation.adminUnreadCount || 0),
        customerUnreadCount: Number(conversation.customerUnreadCount || 0),
        customer: relatedMaps.userMap.get(Number(conversation.customerUserId)) || null,
        admin: conversation.adminUserId
          ? relatedMaps.userMap.get(Number(conversation.adminUserId)) || null
          : null,
        assignedBy: conversation.assignedByUserId
          ? relatedMaps.userMap.get(Number(conversation.assignedByUserId)) || null
          : null,
        order: conversation.orderId
          ? relatedMaps.orderMap.get(Number(conversation.orderId)) || null
          : null,
      },
      messages: orderedMessages.map((message) => ({
        ...message,
        metadata: parseJsonText(message.metadata),
        sender: message.senderUserId
          ? senderMap.get(Number(message.senderUserId)) || null
          : null,
        attachments: (attachmentMap.get(Number(message.id)) || []).map(
          (attachment) => ({
            ...attachment,
            fileSize: Number(attachment.fileSize || 0),
          })
        ),
      })),
      pagination: {
        total: Number(messageTotalRows[0]?.count || 0),
        page,
        pageSize,
      },
    };
  } catch (error: any) {
    throw createError({
      statusCode: error?.statusCode || 500,
      message: error?.message || "Không thể lấy chi tiết hội thoại hỗ trợ",
    });
  }
});
