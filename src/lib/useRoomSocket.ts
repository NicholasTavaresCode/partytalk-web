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
import type { HostMessage } from "./types";

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

/**
 * Owns the realtime connection for one room: seeds history from REST
 * (`transcript` + `host-messages`), joins the `rooms` namespace, then streams
 * `transcript` / `hostMessage` / `presence` / `sessionEnded` events through
 * `roomReducer`.
 */
export function useRoomSocket(roomId: string): RoomSocketState {
  const socketRef = useRef<RoomsSocket | null>(null);
  const [socket, setSocket] = useState<RoomsSocket | null>(null);
  const [state, dispatch] = useReducer(roomReducer, initialRoomState);

  useEffect(() => {
    let active = true;
    let s: RoomsSocket | undefined;

    // Seed history so late joiners see the conversation so far, host lines included.
    void roomsApi
      .getTranscript(roomId, 100)
      .then((segments) => active && dispatch({ type: "seedTranscript", segments }))
      .catch(() => {});
    void roomsApi
      .getHostMessages(roomId, 100)
      .then((hostMessages) => active && dispatch({ type: "seedHostMessages", hostMessages }))
      .catch(() => {});

    connectRoomsSocket()
      .then((sock) => {
        if (!active) {
          sock.disconnect();
          return;
        }
        s = sock;
        socketRef.current = sock;
        setSocket(sock);

        sock.on("connect", () => {
          dispatch({ type: "connected", connected: true });
          sock.emit("joinRoom", { roomId });
        });
        sock.on("disconnect", () => dispatch({ type: "connected", connected: false }));
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
    };
  }, [roomId]);

  const sendTranscript = useCallback(
    (text: string) => {
      const s = socketRef.current;
      const trimmed = text.trim();
      if (s && trimmed) s.emit("transcript", { roomId, text: trimmed });
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
