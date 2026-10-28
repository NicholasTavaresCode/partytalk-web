"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { connectRoomsSocket, type RoomsSocket } from "./socket";
import { roomsApi } from "./api/rooms";
import { queryKeys } from "./queries";
import type { RoomReport, TopicSuggestion } from "./types";

function upsertById<T extends { id: string }>(list: T[], item: T): T[] {
  if (list.some((x) => x.id === item.id)) return list;
  return [...list, item];
}

/** The room's realtime connection, as the UI should describe it. */
export type RoomConnection = "connecting" | "connected" | "reconnecting" | "failed";

/** Refused handshakes retried after 1, 2, 4, 8, 16 s — then shown as failed. */
const MAX_RETRIES = 5;

export interface RoomSocketState {
  socket: RoomsSocket | null;
  connected: boolean;
  connection: RoomConnection;
  /** Manual retry after `connection` is "failed". */
  reconnect: () => void;
  suggestions: TopicSuggestion[];
  /** uid → display name, for everyone connected (seeded by `roster`, kept by `presence`). */
  presence: Record<string, string | undefined>;
  endedReport: RoomReport | null | undefined; // undefined = not ended; null = ended without report
  ended: boolean;
  /** The owner revoked this user's invite; the server already dropped them from the room. */
  removed: boolean;
  error: string | null;
  sendTranscript: (text: string) => void;
}

/**
 * Owns the realtime connection for one room: joins the `rooms` namespace, seeds
 * topic suggestions from REST, then streams `topicSuggested` / `presence` /
 * `sessionEnded` events. Transcript only flows outward (`sendTranscript`) to feed
 * the AI host — the UI never displays it, so the client ignores `transcript`
 * broadcasts.
 *
 * `isParticipant` gates the `joinRoom` subscription: the server only admits
 * participants, and a first-time visitor's REST join usually lands *after* the
 * socket connects — so we (re)subscribe whenever membership or the connection flips.
 */
export function useRoomSocket(roomId: string, isParticipant: boolean): RoomSocketState {
  const queryClient = useQueryClient();
  const socketRef = useRef<RoomsSocket | null>(null);
  const [socket, setSocket] = useState<RoomsSocket | null>(null);
  const [connection, setConnection] = useState<RoomConnection>("connecting");
  const retriesRef = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [suggestions, setSuggestions] = useState<TopicSuggestion[]>([]);
  const [presence, setPresence] = useState<Record<string, string | undefined>>({});
  const [endedReport, setEndedReport] = useState<RoomReport | null | undefined>(undefined);
  const [ended, setEnded] = useState(false);
  const [removed, setRemoved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let everConnected = false;
    let s: RoomsSocket | undefined;

    // Seed suggestions so late joiners see the topics so far.
    void roomsApi.getSuggestions(roomId, 50).then((s2) => active && setSuggestions(s2)).catch(() => { });

    connectRoomsSocket()
      .then((sock) => {
        if (!active) {
          sock.disconnect();
          return;
        }
        s = sock;
        socketRef.current = sock;
        setSocket(sock);

        // Socket.IO retries a dropped transport by itself, but not a handshake the
        // server refused or a server-side disconnect. Those almost always mean an
        // expired ID token, and the `auth` callback fetches a fresh one — so retry
        // with backoff, then say so instead of sitting there silently disconnected.
        const retry = () => {
          if (!active) return;
          if (retriesRef.current >= MAX_RETRIES) {
            setConnection("failed");
            return;
          }
          const delayMs = 1000 * 2 ** retriesRef.current;
          retriesRef.current += 1;
          setConnection("reconnecting");
          retryTimerRef.current = setTimeout(() => {
            if (active) sock.connect();
          }, delayMs);
        };
        sock.on("connect", () => {
          retriesRef.current = 0;
          setConnection("connected");
          // After a reconnect (often onto another API instance), catch up on
          // whatever changed while we were offline: participants, status, topics.
          if (everConnected) {
            void queryClient.invalidateQueries({ queryKey: queryKeys.room(roomId) });
            void roomsApi
              .getSuggestions(roomId, 50)
              .then((s2) => active && setSuggestions(s2))
              .catch(() => {});
          }
          everConnected = true;
        });
        sock.on("disconnect", (reason) => {
          if (reason === "io client disconnect") return; // we closed it ourselves
          setConnection("reconnecting");
          if (reason === "io server disconnect") retry();
        });
        sock.on("connect_error", () => {
          if (!sock.active) retry(); // refused by the server's auth middleware
        });
        sock.on("topicSuggested", (sug) => setSuggestions((p) => upsertById(p, sug)));
        sock.on("presence", (ev) =>
          setPresence((prev) => {
            if (ev.event === "left") {
              const next = { ...prev };
              delete next[ev.uid];
              return next;
            }
            return { ...prev, [ev.uid]: ev.name ?? prev[ev.uid] };
          }),
        );
        sock.on("sessionEnded", (e) => {
          setEnded(true);
          setEndedReport(e.report ?? null);
        });
        sock.on("removedFromRoom", () => setRemoved(true));
        // Participants and status live in the REST room; refetch it (per-caller view).
        sock.on("roomUpdated", () => {
          void queryClient.invalidateQueries({ queryKey: queryKeys.room(roomId) });
        });
        // Everyone already here when we (re)joined — replaces what we knew.
        sock.on("roster", (e) =>
          setPresence(Object.fromEntries(e.members.map((m) => [m.uid, m.name]))),
        );
        sock.on("error", (e) => setError(e.message));
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Could not connect"));

    return () => {
      active = false;
      clearTimeout(retryTimerRef.current);
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
  }, [roomId, queryClient]);

  const connected = connection === "connected";

  useEffect(() => {
    if (connected && isParticipant) socketRef.current?.emit("joinRoom", { roomId });
  }, [connected, isParticipant, roomId]);

  const reconnect = useCallback(() => {
    const s = socketRef.current;
    if (!s) return;
    clearTimeout(retryTimerRef.current);
    retriesRef.current = 0;
    setConnection("reconnecting");
    s.connect();
  }, []);

  const sendTranscript = useCallback(
    (text: string) => {
      const s = socketRef.current;
      const trimmed = text.trim();
      if (s && trimmed) s.emit("transcript", { roomId, text: trimmed });
    },
    [roomId],
  );

  return {
    socket,
    connected,
    connection,
    reconnect,
    suggestions,
    presence,
    endedReport,
    ended,
    removed,
    error,
    sendTranscript,
  };
}
