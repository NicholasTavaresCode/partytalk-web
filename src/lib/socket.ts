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
  return io(`${env.socketUrl}/rooms`, {
    // A callback, not a value: Socket.IO calls it on every (re)connection attempt, so
    // a reconnect after the 1-hour ID token expired (Cloud Run ends every socket at its
    // request timeout) carries a fresh token instead of being refused forever.
    auth: (cb) => {
      void getIdToken().then(
        (token) => cb({ token }),
        () => cb({ token: null }),
      );
    },
    // Start with HTTP long-polling, then upgrade to WebSocket. This survives
    // reverse proxies that don't forward the WS upgrade (websocket-only would
    // fail outright there).
    transports: ["polling", "websocket"],
    autoConnect: true,
    reconnection: true,
  });
}
