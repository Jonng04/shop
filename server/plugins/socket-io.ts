import { createServer } from "node:http";

import { and, eq, or, sql } from "drizzle-orm";
import { Server as SocketIOServer } from "socket.io";
import type { Socket } from "socket.io";

import {
  SOCKET_EVENTS,
  SOCKET_IO_DEFAULT_PATH,
  SOCKET_ROOMS,
  type ConversationRoomPayload,
  type SocketAckResponse,
} from "~~/shared/socket";
import { db } from "../database";
import { supportConversations } from "../database/schema";
import { isAdminUser } from "../utils/admin-permissions";
import { isRootSupportAdmin } from "../utils/support-chat";
import {
  clearSocketIOServer,
  getSocketIOServer,
  setSocketIOServer,
} from "../utils/socket-io";

interface SessionUser {
  id?: number | null;
  username?: string | null;
  email?: string | null;
  role?: string | null;
  permissions?: string[];
  [key: string]: unknown;
}

interface SocketSessionData {
  user?: SessionUser | null;
  [key: string]: unknown;
}

interface ChatSocketData {
  session: SocketSessionData;
  user: SessionUser;
}

const normalizeHeaders = (
  headers: Record<string, string | string[] | undefined>
) => {
  const normalizedHeaders = new Headers();

  for (const [key, value] of Object.entries(headers)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        normalizedHeaders.append(key, item);
      }
      continue;
    }

    if (typeof value === "string") {
      normalizedHeaders.set(key, value);
    }
  }

  return normalizedHeaders;
};

const hasMessageAccess = (user?: SessionUser | null) => {
  if (!user?.id) {
    return false;
  }

  if (String(user.role || "").trim() === "admin") {
    return true;
  }

  const permissions = Array.isArray(user.permissions) ? user.permissions : [];

  return (
    permissions.includes("*") ||
    permissions.includes("view_messages") ||
    permissions.includes("manage_messages")
  );
};

const createAck =
  (callback?: (response: SocketAckResponse) => void) =>
  (response: SocketAckResponse) => {
    callback?.(response);
  };

const canJoinConversation = async (
  user: SessionUser,
  conversationId: number
) => {
  if (!user?.id) {
    return false;
  }

  if (isAdminUser(user) && hasMessageAccess(user)) {
    const conversation = await db.query.supportConversations.findFirst({
      where: isRootSupportAdmin(String(user.role || "").trim())
        ? eq(supportConversations.id, conversationId)
        : and(
            eq(supportConversations.id, conversationId),
            or(
              eq(supportConversations.adminUserId, Number(user.id)),
              sql`${supportConversations.adminUserId} is null`
            )!
          ),
      columns: { id: true },
    });

    return Boolean(conversation);
  }

  const conversation = await db.query.supportConversations.findFirst({
    where: and(
      eq(supportConversations.id, conversationId),
      eq(supportConversations.customerUserId, Number(user.id))
    ),
    columns: { id: true },
  });

  return Boolean(conversation);
};

const attachSocketHandlers = (
  socket: Socket<any, any, any, ChatSocketData>
) => {
  const { user } = socket.data;

  socket.join(SOCKET_ROOMS.user(Number(user.id)));

  if (isAdminUser(user) && hasMessageAccess(user)) {
    socket.join(SOCKET_ROOMS.admin(Number(user.id)));
    if (isRootSupportAdmin(String(user.role || "").trim())) {
      socket.join(SOCKET_ROOMS.admins());
    }
  }

  socket.emit(SOCKET_EVENTS.sessionReady, {
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      permissions: user.permissions || [],
    },
  });

  socket.on(
    SOCKET_EVENTS.conversationJoin,
    async (
      payload: ConversationRoomPayload,
      callback?: (response: SocketAckResponse) => void
    ) => {
      const ack = createAck(callback);
      const conversationId = Number(payload?.conversationId);

      if (!Number.isInteger(conversationId) || conversationId <= 0) {
        ack({ ok: false, message: "conversationId không hợp lệ" });
        return;
      }

      const allowed = await canJoinConversation(user, conversationId);

      if (!allowed) {
        ack({ ok: false, message: "Bạn không có quyền vào hội thoại này" });
        return;
      }

      await socket.join(SOCKET_ROOMS.conversation(conversationId));
      ack({ ok: true });
    }
  );

  socket.on(
    SOCKET_EVENTS.conversationLeave,
    async (
      payload: ConversationRoomPayload,
      callback?: (response: SocketAckResponse) => void
    ) => {
      const ack = createAck(callback);
      const conversationId = Number(payload?.conversationId);

      if (!Number.isInteger(conversationId) || conversationId <= 0) {
        ack({ ok: false, message: "conversationId không hợp lệ" });
        return;
      }

      await socket.leave(SOCKET_ROOMS.conversation(conversationId));
      ack({ ok: true });
    }
  );

  socket.on("disconnect", () => {});
};

export default defineNitroPlugin((nitroApp) => {
  if (getSocketIOServer()) {
    return;
  }

  const runtimeConfig = useRuntimeConfig();
  const socketIoPath =
    runtimeConfig.socketIo.path ||
    runtimeConfig.public.socketIoPath ||
    SOCKET_IO_DEFAULT_PATH;

  const io = setSocketIOServer(
    new SocketIOServer({
      path: socketIoPath,
      cors: {
        origin: (_origin, callback) => callback(null, true),
        credentials: true,
      },
      transports: ["websocket"],

      maxHttpBufferSize: 1e6,

      perMessageDeflate: {
        threshold: 1024,
      },

      pingInterval: 25000, // Send ping every 25s
      pingTimeout: 10000, // Wait 10s for pong, then disconnect
      upgradeTimeout: 10000, // Timeout for upgrade handshake
    })
  );
  const socketServer = createServer();

  io.use(async (socket, next) => {
    try {
      const session = (await getUserSession({
        headers: normalizeHeaders(socket.handshake.headers),
        context: {},
      })) as SocketSessionData;
      const user = session?.user as SessionUser | undefined;

      if (!user?.id) {
        next(new Error("Unauthorized"));
        return;
      }

      socket.data.session = session;
      socket.data.user = user;
      next();
    } catch (error) {
      next(error as Error);
    }
  });

  io.on("connection", (socket) => {
    attachSocketHandlers(socket);
  });

  io.attach(socketServer);
  socketServer.listen(
    Number(runtimeConfig.socketIo.port),
    runtimeConfig.socketIo.host
  );

  nitroApp.hooks.hook("close", async () => {
    try {
      await io.close();
    } catch {}

    await new Promise<void>((resolve) => {
      if (!socketServer.listening) {
        resolve();
        return;
      }

      socketServer.close((error) => {
        if (error) {
          resolve();
          return;
        }

        resolve();
      });
    });
    clearSocketIOServer();
  });
});
