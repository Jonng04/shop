import { desc, eq } from "drizzle-orm";

import { db } from "../../../../database";
import {
  supportConversations,
  supportMessages,
} from "../../../../database/schema";
import {
  emitToConversation,
  emitToUser,
} from "../../../../utils/socket-io";
import {
  assertSupportConversationAccess,
  getConversationById,
  requireSupportViewPermission,
  type SupportAdminUser,
} from "../../../../utils/support-chat";
import { SOCKET_EVENTS } from "~~/shared/socket";

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event);
  const user = session.user as SupportAdminUser;

  await requireSupportViewPermission(user);

  const id = Number(getRouterParam(event, "id") || 0);

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

    const latestMessage = await db.query.supportMessages.findFirst({
      where: eq(supportMessages.conversationId, id),
      orderBy: [desc(supportMessages.id)],
      columns: {
        id: true,
      },
    });

    await db
      .update(supportConversations)
      .set({
        adminUnreadCount: 0,
        adminLastReadMessageId: latestMessage?.id || conversation.adminLastReadMessageId,
      })
      .where(eq(supportConversations.id, id));

    const payload = {
      conversationId: id,
      actorRole: "admin",
      actorUserId: Number(user.id || 0) || null,
      lastReadMessageId:
        Number(latestMessage?.id || conversation.adminLastReadMessageId || 0) || null,
    };

    emitToConversation(id, SOCKET_EVENTS.conversationRead, payload);

    if (conversation.customerUserId) {
      emitToUser(conversation.customerUserId, SOCKET_EVENTS.conversationRead, payload);
    }

    return {
      success: true,
      data: payload,
    };
  } catch (error: any) {
    throw createError({
      statusCode: error?.statusCode || 500,
      message: error?.message || "Không thể đánh dấu đã đọc hội thoại",
    });
  }
});
