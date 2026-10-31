"use client";

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
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
import { useApplyRoom } from "./queries";
import type { HostMessage } from "./types";

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
 * `transcript` / `hostMessage` / `presence` / `sessionEnded` events through
 * `roomReducer`.
 */
export function useRoomSocket(roomId: string, { enabled }: Options): RoomSocketState {
  const socketRef = useRef<RoomsSocket | null>(null);
  const [socket, setSocket] = useState<RoomsSocket | null>(null);
  const [state, dispatch] = useReducer(roomReducer, initialRoomState);
  const applyRoom = useApplyRoom();

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

    connectRoomsSocket()
      .then((sock) => {
        if (!active) {
          sock.disconnect();
          return;
        }
        s = sock;
        socketRef.current = sock;
        setSocket(sock);

        // Fires on every (re)connect, so a dropped connection re-joins by itself.
        sock.on("connect", () => {
          dispatch({ type: "connected", connected: true });
          dispatch({ type: "error", message: null });
          sock.emit("joinRoom", { roomId });
        });
        sock.on("disconnect", (reason) => {
          dispatch({ type: "connected", connected: false });
          // socket.io reconnects by itself for every reason except a server-side
          // disconnect, so handle that one here rather than staying dead.
          if (reason === "io server disconnect" && active) {
            dispatch({ type: "error", message: "Disconnected by the server — reconnecting…" });
            reconnectTimer = setTimeout(() => active && sock.connect(), 1000);
          }
        });
        sock.on("connect_error", (e) =>
          dispatch({ type: "error", message: e?.message ? `Connection failed: ${e.message}` : "Connection failed" }),
        );
        // Membership/status/scheduledEndAt come from the Room itself, never from presence.
        sock.on("roomUpdated", (room) => applyRoom(room));
        sock.on("transcript", (segment) => dispatch({ type: "transcript", segment }));
        sock.on("hostMessage", (message) => dispatch({ type: "hostMessage", message }));
        sock.on("presence", (event) => dispatch({ type: "presence", event }));
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
  }, [roomId, enabled, applyRoom]);

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
