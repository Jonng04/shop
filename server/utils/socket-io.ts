import type { Server as SocketIOServer } from "socket.io";

import { SOCKET_ROOMS } from "~~/shared/socket";

const SOCKET_IO_GLOBAL_KEY = "__shopSocketIoServer";

declare global {
  // eslint-disable-next-line no-var
  var __shopSocketIoServer: SocketIOServer | undefined;
}

const socketGlobals = globalThis as typeof globalThis & {
  [SOCKET_IO_GLOBAL_KEY]?: SocketIOServer;
};

export const getSocketIOServer = () => socketGlobals[SOCKET_IO_GLOBAL_KEY];

export const setSocketIOServer = (io: SocketIOServer) => {
  socketGlobals[SOCKET_IO_GLOBAL_KEY] = io;
  return io;
};

export const clearSocketIOServer = () => {
  delete socketGlobals[SOCKET_IO_GLOBAL_KEY];
};

export const emitToUser = (
  userId: number | string,
  eventName: string,
  payload: unknown
) => {
  getSocketIOServer()?.to(SOCKET_ROOMS.user(userId)).emit(eventName, payload);
};

export const emitToAdmin = (
  adminId: number | string,
  eventName: string,
  payload: unknown
) => {
  getSocketIOServer()?.to(SOCKET_ROOMS.admin(adminId)).emit(eventName, payload);
};

export const emitToAdmins = (eventName: string, payload: unknown) => {
  getSocketIOServer()?.to(SOCKET_ROOMS.admins()).emit(eventName, payload);
};

export const emitToConversation = (
  conversationId: number | string,
  eventName: string,
  payload: unknown
) => {
  getSocketIOServer()
    ?.to(SOCKET_ROOMS.conversation(conversationId))
    .emit(eventName, payload);
};
