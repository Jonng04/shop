import type { Socket } from "socket.io-client";

export const useSocket = () => {
  const { $socket } = useNuxtApp();
  return $socket as Socket;
};
