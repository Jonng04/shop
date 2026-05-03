import { desc, eq } from "drizzle-orm";

import { db } from "../../../database";
import {
  supportConversations,
  supportMessages,
  users,
} from "../../../database/schema";
import { createActivityLog } from "../../../utils/activity-log";
import {
  ADMIN_PERMISSION_ALL,
  getAdminPermissionsByRoleName,
} from "../../../utils/admin-permissions";
import {
  emitToAdmin,
  emitToAdmins,
  emitToConversation,
  emitToUser,
} from "../../../utils/socket-io";
import {
  assertSupportConversationAccess,
  getConversationById,
  getScopedSupportAdminRecipientIds,
  getSupportActor,
  getSupportRelatedMaps,
  normalizeTags,
  requireSupportViewPermission,
  requireSupportManagePermission,
  type SupportAdminUser,
} from "../../../utils/support-chat";
import { SOCKET_EVENTS } from "~~/shared/socket";

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event);
  const user = session.user as SupportAdminUser;

  const id = Number(getRouterParam(event, "id") || 0);

  if (!Number.isInteger(id) || id <= 0) {
    throw createError({
      statusCode: 400,
      message: "ID hội thoại không hợp lệ",
    });
  }

  const body = await readBody(event);
  const actor = getSupportActor(event, user);

  // Handle read: true — mark conversation as read by admin
  if (body?.read === true) {
    try {
      await requireSupportViewPermission(user);

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
        columns: { id: true },
      });

      await db
        .update(supportConversations)
        .set({
          adminUnreadCount: 0,
          adminLastReadMessageId:
            latestMessage?.id || conversation.adminLastReadMessageId,
        })
        .where(eq(supportConversations.id, id));

      const payload = {
        conversationId: id,
        actorRole: "admin",
        actorUserId: Number(user.id || 0) || null,
        lastReadMessageId:
          Number(
            latestMessage?.id || conversation.adminLastReadMessageId || 0
          ) || null,
      };

      emitToConversation(id, SOCKET_EVENTS.conversationRead, payload);

      if (conversation.customerUserId) {
        emitToUser(
          conversation.customerUserId,
          SOCKET_EVENTS.conversationRead,
          payload
        );
      }

      return { success: true, data: payload };
    } catch (error: any) {
      throw createError({
        statusCode: error?.statusCode || 500,
        message: error?.message || "Không thể đánh dấu đã đọc hội thoại",
      });
    }
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

    let nextAdminUserId =
      body?.adminUserId !== undefined
        ? body.adminUserId
          ? Number(body.adminUserId)
          : null
        : undefined;

    const currentUserId = Number(user.id || 0) || null;
    const currentUserRole = String(user.role || "")
      .trim()
      .toLowerCase();
    const isRootAdmin = currentUserRole === "admin";
    const isAssignmentChange = body?.adminUserId !== undefined;
    const requestedStatus =
      body?.status !== undefined ? String(body.status || "").trim() : undefined;
    const hasManagementChanges =
      body?.priority !== undefined ||
      body?.subject !== undefined ||
      body?.tags !== undefined;
    const hasUnsupportedStatusChange =
      requestedStatus !== undefined &&
      requestedStatus !== "" &&
      requestedStatus !== "active";
    const canClaimUnassignedConversation =
      isAssignmentChange &&
      !hasManagementChanges &&
      !hasUnsupportedStatusChange &&
      currentUserId &&
      nextAdminUserId === currentUserId &&
      !conversation.adminUserId;

    if (canClaimUnassignedConversation) {
      await requireSupportViewPermission(user);
    } else {
      await requireSupportManagePermission(user);
    }

    if (isAssignmentChange && !canClaimUnassignedConversation && !isRootAdmin) {
      throw createError({
        statusCode: 403,
        message: "Chỉ admin mới được chuyển phụ trách",
      });
    }

    if (nextAdminUserId !== undefined && nextAdminUserId !== null) {
      const targetAdmin = await db.query.users.findFirst({
        where: eq(users.id, nextAdminUserId),
      });

      if (!targetAdmin || String(targetAdmin.role || "user") === "user") {
        throw createError({
          statusCode: 400,
          message: "Admin được gán không hợp lệ",
        });
      }

      const targetPermissions = await getAdminPermissionsByRoleName(
        String(targetAdmin.role || "")
      );
      const canManageMessages =
        targetPermissions.includes(ADMIN_PERMISSION_ALL) ||
        targetPermissions.includes("manage_messages");

      if (!canManageMessages) {
        throw createError({
          statusCode: 400,
          message: "Admin được gán không có quyền xem và trả lời chat",
        });
      }
    }

    const nextStatus = requestedStatus;
    const nextPriority =
      body?.priority !== undefined
        ? String(body.priority || "").trim()
        : undefined;
    const nextSubject =
      body?.subject !== undefined
        ? String(body.subject || "").trim()
        : undefined;
    const nextTags = normalizeTags(body?.tags);
    const adminChanged =
      nextAdminUserId !== undefined &&
      nextAdminUserId !== conversation.adminUserId;

    await db
      .update(supportConversations)
      .set({
        adminUserId: nextAdminUserId,
        assignedByUserId: adminChanged
          ? Number(user.id || 0) || null
          : undefined,
        assignedAt: adminChanged
          ? nextAdminUserId
            ? new Date()
            : null
          : undefined,
        status: nextStatus || undefined,
        priority: nextPriority || undefined,
        subject: nextSubject !== undefined ? nextSubject || null : undefined,
        tags: nextTags,
        resolvedAt:
          nextStatus === "resolved"
            ? conversation.resolvedAt || new Date()
            : nextStatus && nextStatus !== "resolved"
              ? null
              : undefined,
        closedAt:
          nextStatus === "closed"
            ? conversation.closedAt || new Date()
            : nextStatus && nextStatus !== "closed"
              ? null
              : undefined,
      })
      .where(eq(supportConversations.id, id));

    const updatedConversation = await getConversationById(id);

    if (!updatedConversation) {
      throw createError({
        statusCode: 500,
        message: "Không thể tải hội thoại sau khi cập nhật",
      });
    }

    const relatedMaps = await getSupportRelatedMaps([updatedConversation]);
    const previousScopedAdminRecipientIds =
      await getScopedSupportAdminRecipientIds(conversation.adminUserId);
    const nextScopedAdminRecipientIds = await getScopedSupportAdminRecipientIds(
      updatedConversation.adminUserId
    );
    const scopedAdminRecipientIds = [
      ...new Set([
        ...previousScopedAdminRecipientIds,
        ...nextScopedAdminRecipientIds,
      ]),
    ];
    const conversationPayload = {
      ...updatedConversation,
      adminUnreadCount: Number(updatedConversation.adminUnreadCount || 0),
      customerUnreadCount: Number(updatedConversation.customerUnreadCount || 0),
      customer:
        relatedMaps.userMap.get(Number(updatedConversation.customerUserId)) ||
        null,
      admin: updatedConversation.adminUserId
        ? relatedMaps.userMap.get(Number(updatedConversation.adminUserId)) ||
          null
        : null,
      assignedBy: updatedConversation.assignedByUserId
        ? relatedMaps.userMap.get(
            Number(updatedConversation.assignedByUserId)
          ) || null
        : null,
      order: updatedConversation.orderId
        ? relatedMaps.orderMap.get(Number(updatedConversation.orderId)) || null
        : null,
    };

    emitToConversation(id, SOCKET_EVENTS.conversationUpdated, {
      conversationId: id,
      conversation: conversationPayload,
    });
    emitToAdmins(SOCKET_EVENTS.conversationUpdated, {
      conversationId: id,
      conversation: conversationPayload,
    });
    for (const adminId of scopedAdminRecipientIds) {
      emitToAdmin(adminId, SOCKET_EVENTS.conversationUpdated, {
        conversationId: id,
        conversation: conversationPayload,
      });
    }

    if (adminChanged) {
      emitToConversation(id, SOCKET_EVENTS.conversationAssigned, {
        conversationId: id,
        adminUserId: nextAdminUserId || null,
        assignedByUserId: Number(user.id || 0) || null,
      });
      emitToAdmins(SOCKET_EVENTS.conversationAssigned, {
        conversationId: id,
        adminUserId: nextAdminUserId || null,
        assignedByUserId: Number(user.id || 0) || null,
      });
      for (const adminId of scopedAdminRecipientIds) {
        emitToAdmin(adminId, SOCKET_EVENTS.conversationAssigned, {
          conversationId: id,
          adminUserId: nextAdminUserId || null,
          assignedByUserId: Number(user.id || 0) || null,
        });
      }
    }

    if (nextStatus === "resolved" || nextStatus === "closed") {
      emitToConversation(id, SOCKET_EVENTS.conversationResolved, {
        conversationId: id,
        status: nextStatus,
      });

      if (conversation.customerUserId) {
        emitToUser(
          conversation.customerUserId,
          SOCKET_EVENTS.conversationResolved,
          {
            conversationId: id,
            status: nextStatus,
          }
        );
      }
    }

    if (conversation.customerUserId) {
      emitToUser(
        conversation.customerUserId,
        SOCKET_EVENTS.conversationUpdated,
        {
          conversationId: id,
          conversation: conversationPayload,
        }
      );
    }

    await createActivityLog({
      ...actor,
      action: "Cập nhật hội thoại hỗ trợ",
      module: "Support Chat",
      target: conversation.conversationCode,
      description: `Đã cập nhật hội thoại #${conversation.conversationCode}`,
      level: "warning",
      metadata: {
        conversationId: id,
        before: {
          adminUserId: conversation.adminUserId,
          status: conversation.status,
          priority: conversation.priority,
          subject: conversation.subject,
          tags: conversation.tags,
        },
        after: {
          adminUserId:
            nextAdminUserId !== undefined
              ? nextAdminUserId
              : conversation.adminUserId,
          status: nextStatus || conversation.status,
          priority: nextPriority || conversation.priority,
          subject:
            nextSubject !== undefined
              ? nextSubject || null
              : conversation.subject,
          tags: nextTags !== undefined ? nextTags : conversation.tags,
        },
      },
    });

    return {
      success: true,
      message: "Cập nhật hội thoại thành công",
      data: conversationPayload,
    };
  } catch (error: any) {
    throw createError({
      statusCode: error?.statusCode || 500,
      message: error?.message || "Không thể cập nhật hội thoại hỗ trợ",
    });
  }
});
