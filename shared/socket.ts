export const SOCKET_IO_DEFAULT_PATH = "/socket.io";

export const SOCKET_EVENTS = {
  sessionReady: "session:ready",
  conversationJoin: "conversation:join",
  conversationLeave: "conversation:leave",
  messageNew: "message:new",
  conversationUpdated: "conversation:updated",
  conversationRead: "conversation:read",
  conversationAssigned: "conversation:assigned",
  conversationResolved: "conversation:resolved",
  presenceUpdate: "presence:update",
  paymentUpdated: "payment:updated",
} as const;

export const SOCKET_ROOMS = {
  user: (userId: number | string) => `user:${userId}`,
  admin: (adminId: number | string) => `admin:${adminId}`,
  conversation: (conversationId: number | string) =>
    `conversation:${conversationId}`,
  admins: () => "admins",
} as const;

export interface ConversationRoomPayload {
  conversationId: number;
}

export interface SocketAckResponse {
  ok: boolean;
  message?: string;
}
