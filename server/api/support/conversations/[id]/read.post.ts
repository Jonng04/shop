import { and, desc, eq } from "drizzle-orm";

import { db } from "../../../../database";
import {
  supportConversations,
  supportMessages,
} from "../../../../database/schema";
import {
  emitToAdmin,
  emitToAdmins,
  emitToConversation,
} from "../../../../utils/socket-io";
import {
  getCustomerConversationById,
  getScopedSupportAdminRecipientIds,
  requireSupportCustomer,
  type SupportCustomerUser,
} from "../../../../utils/support-chat";
import { SOCKET_EVENTS } from "~~/shared/socket";

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event);
  const user = session.user as SupportCustomerUser;

  requireSupportCustomer(user);

  const id = Number(getRouterParam(event, "id") || 0);

  if (!Number.isInteger(id) || id <= 0) {
    throw createError({
      statusCode: 400,
      message: "ID hội thoại không hợp lệ",
    });
  }

  try {
    const conversation = await getCustomerConversationById(id, Number(user.id));

    if (!conversation) {
      throw createError({
        statusCode: 404,
        message: "Hội thoại không tồn tại",
      });
    }

    const latestMessage = await db.query.supportMessages.findFirst({
      where: and(
        eq(supportMessages.conversationId, id),
        eq(supportMessages.isInternal, false)
      ),
      orderBy: [desc(supportMessages.id)],
      columns: {
        id: true,
      },
    });

    await db
      .update(supportConversations)
      .set({
        customerUnreadCount: 0,
        customerLastReadMessageId:
          latestMessage?.id || conversation.customerLastReadMessageId,
      })
      .where(eq(supportConversations.id, id));

    const payload = {
      conversationId: id,
      actorRole: "customer",
      actorUserId: Number(user.id || 0) || null,
      lastReadMessageId:
        Number(latestMessage?.id || conversation.customerLastReadMessageId || 0) ||
        null,
    };

    const scopedAdminRecipientIds = await getScopedSupportAdminRecipientIds(
      conversation.adminUserId
    );

    emitToConversation(id, SOCKET_EVENTS.conversationRead, payload);
    emitToAdmins(SOCKET_EVENTS.conversationRead, payload);
    for (const adminId of scopedAdminRecipientIds) {
      emitToAdmin(adminId, SOCKET_EVENTS.conversationRead, payload);
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
