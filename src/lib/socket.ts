"use client";

import { io, type Socket } from "socket.io-client";
import { env } from "./env";
import { getIdToken } from "./firebase";
import type { ClientToServerEvents, ServerToClientEvents } from "./types";

export type RoomsSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

/**
 * Connect to the backend's Socket.IO `rooms` namespace, authenticating with the
 * Firebase ID token in the handshake (`auth.token`) — the shape the backend's
 * WsAuthenticator reads.
 */
export async function connectRoomsSocket(): Promise<RoomsSocket> {
  const token = await getIdToken();
  return io(`${env.socketUrl}/rooms`, {
    auth: { token },
    transports: ["websocket"],
    autoConnect: true,
    reconnection: true,
  });
}
