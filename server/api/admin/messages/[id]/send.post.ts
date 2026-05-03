import { eq, sql } from "drizzle-orm";

import { db } from "../../../../database";
import {
  supportConversations,
  supportMessageAttachments,
  supportMessages,
} from "../../../../database/schema";
import { createActivityLog } from "../../../../utils/activity-log";
import {
  emitToAdmin,
  emitToAdmins,
  emitToConversation,
  emitToUser,
} from "../../../../utils/socket-io";
import {
  buildMessagePreview,
  assertSupportConversationAccess,
  getConversationById,
  getScopedSupportAdminRecipientIds,
  getSupportActor,
  stringifyJsonText,
  requireSupportManagePermission,
  type SupportAdminUser,
} from "../../../../utils/support-chat";
import { SOCKET_EVENTS } from "~~/shared/socket";

interface AttachmentInput {
  storageKey?: string | null;
  fileName?: string | null;
  originalName?: string | null;
  fileUrl?: string | null;
  thumbnailUrl?: string | null;
  mimeType?: string | null;
  fileSize?: number | null;
  width?: number | null;
  height?: number | null;
  durationSeconds?: number | null;
}

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event);
  const user = session.user as SupportAdminUser;

  await requireSupportManagePermission(user);

  const id = Number(getRouterParam(event, "id") || 0);

  if (!Number.isInteger(id) || id <= 0) {
    throw createError({
      statusCode: 400,
      message: "ID hội thoại không hợp lệ",
    });
  }

  const body = await readBody(event);
  const content = String(body?.content || "").trim();
  const messageType = String(body?.messageType || "text").trim();
  const isInternal = Boolean(body?.isInternal);
  const replyToMessageId = body?.replyToMessageId
    ? Number(body.replyToMessageId)
    : null;
  const clientMessageId = body?.clientMessageId
    ? String(body.clientMessageId).trim()
    : null;
  const metadata = body?.metadata ?? null;
  const attachments = Array.isArray(body?.attachments)
    ? (body.attachments as AttachmentInput[])
    : [];

  if (!content && attachments.length === 0) {
    throw createError({
      statusCode: 400,
      message: "Tin nhắn không được để trống",
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

    const actor = getSupportActor(event, user);

    const result = await db.transaction(async (tx) => {
      const insertedMessages = await tx
        .insert(supportMessages)
        .values({
          conversationId: id,
          clientMessageId: clientMessageId || null,
          senderUserId: Number(user.id || 0) || null,
          senderRole: "admin",
          messageType,
          content: content || null,
          metadata: stringifyJsonText(metadata),
          replyToMessageId,
          isInternal,
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
            fileName: String(attachment.fileName || attachment.originalName || "")
              .trim(),
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

      const nextStatus =
        conversation.status === "resolved" || conversation.status === "closed"
          ? "active"
          : conversation.status || "active";

      await tx
        .update(supportConversations)
        .set({
          adminUserId: conversation.adminUserId || (Number(user.id || 0) || null),
          assignedByUserId:
            conversation.adminUserId || (Number(user.id || 0) || null)
              ? Number(user.id || 0) || null
              : conversation.assignedByUserId,
          assignedAt:
            conversation.adminUserId || (Number(user.id || 0) || null)
              ? conversation.assignedAt || new Date()
              : conversation.assignedAt,
          status: nextStatus,
          firstResponseAt: conversation.firstResponseAt || new Date(),
          lastMessageId: messageId,
          lastMessagePreview: buildMessagePreview({
            content,
            messageType,
            attachmentsCount: attachments.length,
          }),
          lastMessageSenderRole: "admin",
          lastMessageAt: sql`CONVERT_TZ(UTC_TIMESTAMP(), '+00:00', '+07:00')`,
          adminUnreadCount: isInternal
            ? Number(conversation.adminUnreadCount || 0)
            : 0,
          customerUnreadCount: isInternal
            ? Number(conversation.customerUnreadCount || 0)
            : Number(conversation.customerUnreadCount || 0) + 1,
        })
        .where(eq(supportConversations.id, id));

      const createdMessage = await tx.query.supportMessages.findFirst({
        where: eq(supportMessages.id, messageId),
      });

      const createdAttachments = attachments.length
        ? await tx.query.supportMessageAttachments.findMany({
            where: eq(supportMessageAttachments.messageId, messageId),
          })
        : [];

      return {
        message: createdMessage,
        attachments: createdAttachments,
        nextStatus,
      };
    });

    const payload = {
      conversationId: id,
      message: {
        ...result.message,
        attachments: result.attachments.map((attachment) => ({
          ...attachment,
          fileSize: Number(attachment.fileSize || 0),
        })),
      },
    };

    const scopedAdminRecipientIds = await getScopedSupportAdminRecipientIds(
      conversation.adminUserId || (Number(user.id || 0) || null)
    );

    emitToConversation(id, SOCKET_EVENTS.messageNew, payload);
    emitToConversation(id, SOCKET_EVENTS.conversationUpdated, {
      conversationId: id,
      status: result.nextStatus,
    });
    emitToAdmins(SOCKET_EVENTS.conversationUpdated, {
      conversationId: id,
      status: result.nextStatus,
    });
    for (const adminId of scopedAdminRecipientIds) {
      emitToAdmin(adminId, SOCKET_EVENTS.conversationUpdated, {
        conversationId: id,
        status: result.nextStatus,
      });
    }

    if (!isInternal && conversation.customerUserId) {
      emitToUser(conversation.customerUserId, SOCKET_EVENTS.messageNew, payload);
      emitToUser(conversation.customerUserId, SOCKET_EVENTS.conversationUpdated, {
        conversationId: id,
        status: result.nextStatus,
      });
    }

    await createActivityLog({
      ...actor,
      action: "Gửi tin nhắn hỗ trợ",
      module: "Support Chat",
      target: conversation.conversationCode,
      description: `Đã gửi tin nhắn trong hội thoại #${conversation.conversationCode}`,
      level: "info",
      metadata: {
        conversationId: id,
        messageType,
        isInternal,
        attachmentsCount: attachments.length,
      },
    });

    return {
      success: true,
      message: "Gửi tin nhắn thành công",
      data: payload,
    };
  } catch (error: any) {
    throw createError({
      statusCode: error?.statusCode || 500,
      message: error?.message || "Không thể gửi tin nhắn hỗ trợ",
    });
  }
});
