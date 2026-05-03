import { io, type Socket } from "socket.io-client";

import { SOCKET_IO_DEFAULT_PATH } from "~~/shared/socket";

const resolveSocketUrl = (config: ReturnType<typeof useRuntimeConfig>) => {
  const configuredUrl = String(config.public.socketIoUrl || "").trim();

  if (configuredUrl) {
    return configuredUrl;
  }

  if (!import.meta.client) {
    return undefined;
  }

  const configuredPort = Number(config.public.socketIoPort || 0);
  const currentProtocol = window.location.protocol;
  const currentHostname = window.location.hostname;
  const currentPort = Number(window.location.port || 0);

  if (!configuredPort) {
    return window.location.origin;
  }

  if (configuredPort === currentPort) {
    return window.location.origin;
  }

  return `${currentProtocol}//${currentHostname}:${configuredPort}`;
};

export default defineNuxtPlugin((nuxtApp) => {
  const config = useRuntimeConfig();
  const { loggedIn } = useUserSession();
  const socketPath = config.public.socketIoPath || SOCKET_IO_DEFAULT_PATH;
  const socketUrl = resolveSocketUrl(config);
  const socket: Socket = socketUrl
    ? io(socketUrl, {
        path: socketPath,
        withCredentials: true,
        autoConnect: false,
        transports: ["websocket", "polling"],
      })
    : io({
        path: socketPath,
        withCredentials: true,
        autoConnect: false,
        transports: ["websocket", "polling"],
      });

  if (loggedIn.value) {
    socket.connect();
  }

  const stopLoggedInWatch = watch(
    loggedIn,
    (isLoggedIn) => {
      if (isLoggedIn) {
        if (!socket.connected) {
          socket.connect();
        }
        return;
      }

      if (socket.connected) {
        socket.disconnect();
      }
    },
    { immediate: false }
  );

  const handleConnectError = (error: Error) => {
    console.error("[socket.io] connect_error", error.message);
  };

  if (import.meta.dev) {
    socket.on("connect_error", handleConnectError);
  }

  nuxtApp.hook("app:suspense:resolve", () => {
    stopLoggedInWatch();

    if (import.meta.dev) {
      socket.off("connect_error", handleConnectError);
    }

    if (socket.connected) {
      socket.disconnect();
    }
  });

  return {
    provide: {
      socket,
    },
  };
});
