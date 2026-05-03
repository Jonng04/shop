import { and, desc, eq, inArray, sql } from "drizzle-orm";

import { db } from "../../../../database";
import {
  supportConversations,
  supportMessageAttachments,
  supportMessages,
} from "../../../../database/schema";
import {
  emitToAdmin,
  emitToAdmins,
  emitToConversation,
  emitToUser,
} from "../../../../utils/socket-io";
import {
  buildMessagePreview,
  generateSupportConversationCode,
  getCustomerConversationById,
  getOwnedOrderSummary,
  getScopedSupportAdminRecipientIds,
  stringifyJsonText,
  requireSupportCustomer,
  type SupportCustomerUser,
} from "../../../../utils/support-chat";
import { parseSupportMessageBody } from "../../../../utils/request-validation";
import { SOCKET_EVENTS } from "~~/shared/socket";

// POST /api/support/conversations/:id/messages
// :id = conversationId (or 0 to auto-find/create)
export default defineEventHandler(async (event) => {
  const session = await getUserSession(event);
  const user = session.user as SupportCustomerUser;

  requireSupportCustomer(user);

  const idParam = Number(getRouterParam(event, "id") || 0);
  const requestedConversationId = idParam > 0 ? idParam : undefined;

  const body = parseSupportMessageBody(await readBody(event));
  const content = body.content;
  const messageType = body.messageType;
  const replyToMessageId = body.replyToMessageId;
  const clientMessageId = body.clientMessageId;
  const metadata = body.metadata;
  const subject = body.subject;
  const attachments = body.attachments;
  const normalizedOrderId = body.orderId;

  try {
    const ownedOrder = normalizedOrderId
      ? await getOwnedOrderSummary(Number(user.id), normalizedOrderId)
      : null;

    if (normalizedOrderId && !ownedOrder) {
      throw createError({
        statusCode: 403,
        message: "Bạn không có quyền gắn đơn hàng này vào hội thoại hỗ trợ",
      });
    }

    let conversation = requestedConversationId
      ? await getCustomerConversationById(
          requestedConversationId,
          Number(user.id)
        )
      : await db.query.supportConversations.findFirst({
          where: and(
            eq(supportConversations.customerUserId, Number(user.id)),
            inArray(supportConversations.status, ["waiting", "active"])
          ),
          orderBy: [desc(supportConversations.id)],
        });

    if (!conversation) {
      const conversationCode = await generateSupportConversationCode();
      const inserted = await db
        .insert(supportConversations)
        .values({
          conversationCode,
          customerUserId: Number(user.id),
          status: "waiting",
          priority: "normal",
          source: "web",
          subject: subject || null,
          orderId: ownedOrder?.id || null,
        })
        .$returningId();

      conversation = await getCustomerConversationById(
        Number(inserted[0]?.id || 0),
        Number(user.id)
      );
    } else if (
      conversation.status === "resolved" ||
      conversation.status === "closed"
    ) {
      const conversationCode = await generateSupportConversationCode();
      const inserted = await db
        .insert(supportConversations)
        .values({
          conversationCode,
          customerUserId: Number(user.id),
          status: "waiting",
          priority: conversation.priority || "normal",
          source: conversation.source || "web",
          subject: subject || conversation.subject || null,
          orderId: ownedOrder?.id || conversation.orderId || null,
        })
        .$returningId();

      conversation = await getCustomerConversationById(
        Number(inserted[0]?.id || 0),
        Number(user.id)
      );
    }

    if (!conversation) {
      throw createError({
        statusCode: 500,
        message: "Không thể khởi tạo hội thoại hỗ trợ",
      });
    }

    const result = await db.transaction(async (tx) => {
      const insertedMessages = await tx
        .insert(supportMessages)
        .values({
          conversationId: Number(conversation.id),
          clientMessageId: clientMessageId || null,
          senderUserId: Number(user.id),
          senderRole: "customer",
          messageType,
          content: content || null,
          metadata: stringifyJsonText(metadata),
          replyToMessageId,
          isInternal: false,
        })
        .$returningId();

      const messageId = Number(insertedMessages[0]?.id || 0);

      if (!messageId) {
        throw createError({
          statusCode: 500,
          message: "Không thể tạo tin nhắn mới",
        });
      }

      if (attachments.length) {
        await tx.insert(supportMessageAttachments).values(
          attachments.map((attachment) => ({
            messageId,
            storageKey: attachment.storageKey || null,
            fileName: String(
              attachment.fileName || attachment.originalName || ""
            ).trim(),
            originalName: attachment.originalName || null,
            fileUrl: String(attachment.fileUrl || "").trim(),
            thumbnailUrl: attachment.thumbnailUrl || null,
            mimeType: attachment.mimeType || null,
            fileSize: Number(attachment.fileSize || 0),
            width: attachment.width ? Number(attachment.width) : null,
            height: attachment.height ? Number(attachment.height) : null,
            durationSeconds: attachment.durationSeconds
              ? Number(attachment.durationSeconds)
              : null,
          }))
        );
      }

      const nextStatus = conversation.adminUserId ? "active" : "waiting";

      await tx
        .update(supportConversations)
        .set({
          subject: conversation.subject || subject || null,
          orderId: conversation.orderId || ownedOrder?.id || null,
          status: nextStatus,
          lastMessageId: messageId,
          lastMessagePreview: buildMessagePreview({
            content,
            messageType,
            attachmentsCount: attachments.length,
          }),
          lastMessageSenderRole: "customer",
          lastMessageAt: sql`CONVERT_TZ(UTC_TIMESTAMP(), '+00:00', '+07:00')`,
          adminUnreadCount: Number(conversation.adminUnreadCount || 0) + 1,
          customerUnreadCount: 0,
          resolvedAt: null,
          closedAt: null,
        })
        .where(eq(supportConversations.id, Number(conversation.id)));

      const createdMessage = await tx.query.supportMessages.findFirst({
        where: eq(supportMessages.id, messageId),
      });
      const createdAttachments = attachments.length
        ? await tx.query.supportMessageAttachments.findMany({
            where: eq(supportMessageAttachments.messageId, messageId),
          })
        : [];

      const updatedConversation = await tx.query.supportConversations.findFirst(
        {
          where: eq(supportConversations.id, Number(conversation.id)),
        }
      );

      return {
        conversation: updatedConversation,
        message: createdMessage,
        attachments: createdAttachments,
      };
    });

    const payload = {
      conversationId: Number(result.conversation?.id || conversation.id),
      message: {
        ...result.message,
        attachments: result.attachments.map((attachment) => ({
          ...attachment,
          fileSize: Number(attachment.fileSize || 0),
        })),
      },
    };

    const scopedAdminRecipientIds = await getScopedSupportAdminRecipientIds(
      result.conversation?.adminUserId
    );

    emitToConversation(
      payload.conversationId,
      SOCKET_EVENTS.messageNew,
      payload
    );
    emitToConversation(
      payload.conversationId,
      SOCKET_EVENTS.conversationUpdated,
      {
        conversationId: payload.conversationId,
        status: result.conversation?.status || conversation.status,
      }
    );
    emitToAdmins(SOCKET_EVENTS.messageNew, payload);
    emitToAdmins(SOCKET_EVENTS.conversationUpdated, {
      conversationId: payload.conversationId,
      status: result.conversation?.status || conversation.status,
    });
    for (const adminId of scopedAdminRecipientIds) {
      emitToAdmin(adminId, SOCKET_EVENTS.messageNew, payload);
      emitToAdmin(adminId, SOCKET_EVENTS.conversationUpdated, {
        conversationId: payload.conversationId,
        status: result.conversation?.status || conversation.status,
      });
    }
    emitToUser(Number(user.id), SOCKET_EVENTS.conversationUpdated, {
      conversationId: payload.conversationId,
      status: result.conversation?.status || conversation.status,
    });

    return {
      success: true,
      message: "Gửi tin nhắn thành công",
      data: {
        conversationId: payload.conversationId,
        conversation: result.conversation,
        message: payload.message,
      },
    };
  } catch (error: any) {
    if (error?.statusCode) throw error;
    throw createError({ statusCode: 500, message: "Lỗi máy chủ nội bộ" });
  }
});
