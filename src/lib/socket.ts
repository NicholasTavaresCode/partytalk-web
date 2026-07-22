"use client";

import { io, type Socket } from "socket.io-client";
import { env } from "./env";
import { getIdToken } from "./googleAuth";
import type { ClientToServerEvents, ServerToClientEvents } from "./types";

export type RoomsSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

/**
 * Connect to the backend's Socket.IO `rooms` namespace, authenticating with the
 * Google ID token in the handshake (`auth.token`) — the shape the backend's
 * WsAuthenticator reads.
 */
export async function connectRoomsSocket(): Promise<RoomsSocket> {
  const token = await getIdToken();
  return io(`${env.socketUrl}/rooms`, {
    auth: { token },
    // Start with HTTP long-polling, then upgrade to WebSocket. This survives
    // reverse proxies that don't forward the WS upgrade (websocket-only would
    // fail outright there).
    transports: ["polling", "websocket"],
    autoConnect: true,
    reconnection: true,
  });
}
