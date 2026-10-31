"use client";

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { connectRoomsSocket, type RoomsSocket } from "./socket";
import { roomsApi } from "./api/rooms";
import {
  initialRoomState,
  latestHostMessage,
  mergeHistory,
  roomReducer,
  type HistoryItem,
  type RoomState,
} from "./roomHistory";
import { queryKeys, useApplyRoom } from "./queries";
import type { HostMessage } from "./types";

/** Refused handshakes are retried after 1, 2, 4, 8, 16 s — then reported. */
const MAX_RETRIES = 5;

/** `presence` = which participants currently have a socket subscribed (online), and their names. */
export interface RoomSocketState extends RoomState {
  socket: RoomsSocket | null;
  /** Transcript and host lines interleaved by time, oldest first. */
  history: HistoryItem[];
  /** The most recent thing the host said, if anything. */
  latestHostMessage: HostMessage | undefined;
  /** Add a host message received out-of-band (e.g. the change-topic response). Deduped by id. */
  addHostMessage: (message: HostMessage) => void;
  sendTranscript: (text: string) => void;
}

interface Options {
  /**
   * Connect only once this is true — i.e. once the user is a participant. On a
   * first visit the REST join is still in flight when the page mounts; emitting
   * `joinRoom` before it lands gets rejected by the server, leaving the client
   * disconnected (and the mic disabled) until a reload.
   */
  enabled: boolean;
}

/**
 * Owns the realtime connection for one room: seeds history from REST
 * (`transcript` + `host-messages`), joins the `rooms` namespace, then streams
 * `transcript` / `hostMessage` / `presence` / `roster` / `removedFromRoom` /
 * `sessionEnded` events through `roomReducer`.
 */
export function useRoomSocket(roomId: string, { enabled }: Options): RoomSocketState {
  const socketRef = useRef<RoomsSocket | null>(null);
  const [socket, setSocket] = useState<RoomsSocket | null>(null);
  const [state, dispatch] = useReducer(roomReducer, initialRoomState);
  const applyRoom = useApplyRoom();
  const queryClient = useQueryClient();

  // Seed history so late joiners see the conversation so far, host lines included.
  useEffect(() => {
    let active = true;
    void roomsApi
      .getTranscript(roomId, 100)
      .then((segments) => active && dispatch({ type: "seedTranscript", segments }))
      .catch(() => {});
    void roomsApi
      .getHostMessages(roomId, 100)
      .then((hostMessages) => active && dispatch({ type: "seedHostMessages", hostMessages }))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [roomId]);

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    let s: RoomsSocket | undefined;
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
    let everConnected = false;
    let retries = 0;

    connectRoomsSocket()
      .then((sock) => {
        if (!active) {
          sock.disconnect();
          return;
        }
        s = sock;
        socketRef.current = sock;
        setSocket(sock);

        // socket.io retries a dropped transport by itself, but not a handshake the
        // server refused or a server-side disconnect. Those almost always mean an
        // expired ID token, and the handshake's `auth` callback fetches a fresh one —
        // so retry with backoff, then say so instead of sitting there disconnected.
        const retry = () => {
          if (!active) return;
          if (retries >= MAX_RETRIES) {
            dispatch({ type: "error", message: "Couldn't reconnect to the room. Reload the page to try again." });
            return;
          }
          const delayMs = 1000 * 2 ** retries;
          retries += 1;
          dispatch({ type: "error", message: "Reconnecting to the room…" });
          reconnectTimer = setTimeout(() => active && sock.connect(), delayMs);
        };

        // Fires on every (re)connect, so a dropped connection re-joins by itself.
        sock.on("connect", () => {
          retries = 0;
          dispatch({ type: "connected", connected: true });
          dispatch({ type: "error", message: null });
          sock.emit("joinRoom", { roomId });
          // A reconnect may land on the other API instance after events were
          // missed: catch up on the room (members, status) and the host's lines.
          if (everConnected) {
            void queryClient.invalidateQueries({ queryKey: queryKeys.room(roomId) });
            void roomsApi
              .getHostMessages(roomId, 100)
              .then((hostMessages) => active && dispatch({ type: "seedHostMessages", hostMessages }))
              .catch(() => {});
          }
          everConnected = true;
        });
        sock.on("disconnect", (reason) => {
          dispatch({ type: "connected", connected: false });
          if (reason === "io server disconnect") retry();
        });
        sock.on("connect_error", () => {
          if (!sock.active) retry(); // refused by the server's auth middleware
        });
        // Membership/status/scheduledEndAt come from the Room itself, never from presence.
        sock.on("roomUpdated", (room) => applyRoom(room));
        sock.on("transcript", (segment) => dispatch({ type: "transcript", segment }));
        sock.on("hostMessage", (message) => dispatch({ type: "hostMessage", message }));
        sock.on("presence", (event) => dispatch({ type: "presence", event }));
        sock.on("roster", (e) => dispatch({ type: "roster", members: e.members }));
        sock.on("removedFromRoom", () => dispatch({ type: "removed" }));
        sock.on("sessionEnded", (event) => dispatch({ type: "sessionEnded", event }));
        sock.on("error", (e) => dispatch({ type: "error", message: e.message }));
      })
      .catch((e) =>
        dispatch({ type: "error", message: e instanceof Error ? e.message : "Could not connect" }),
      );

    return () => {
      active = false;
      clearTimeout(reconnectTimer);
      if (s) {
        try {
          s.emit("leaveRoom", { roomId });
        } catch {
          /* noop */
        }
        s.off();
        s.disconnect();
      }
      socketRef.current = null;
      setSocket(null);
      dispatch({ type: "connected", connected: false });
    };
  }, [roomId, enabled, applyRoom, queryClient]);

  const sendTranscript = useCallback(
    (text: string) => {
      const s = socketRef.current;
      const trimmed = text.trim();
      // Drop rather than let socket.io buffer lines to flush after a reconnect.
      if (s?.connected && trimmed) s.emit("transcript", { roomId, text: trimmed });
    },
    [roomId],
  );

  const addHostMessage = useCallback(
    (message: HostMessage) => dispatch({ type: "hostMessage", message }),
    [],
  );

  const history = useMemo(
    () => mergeHistory(state.segments, state.hostMessages),
    [state.segments, state.hostMessages],
  );
  const latest = useMemo(() => latestHostMessage(state.hostMessages), [state.hostMessages]);

  return {
    ...state,
    socket,
    history,
    latestHostMessage: latest,
    addHostMessage,
    sendTranscript,
  };
}
