"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { connectRoomsSocket, type RoomsSocket } from "./socket";
import { roomsApi } from "./api/rooms";
import type { RoomReport, TopicSuggestion, TranscriptSegment } from "./types";

function upsertById<T extends { id: string }>(list: T[], item: T): T[] {
  if (list.some((x) => x.id === item.id)) return list;
  return [...list, item];
}

export interface RoomSocketState {
  socket: RoomsSocket | null;
  connected: boolean;
  segments: TranscriptSegment[];
  suggestions: TopicSuggestion[];
  /** uid → display name (name known only for peers seen joining this session). */
  presence: Record<string, string | undefined>;
  endedReport: RoomReport | null | undefined; // undefined = not ended; null = ended without report
  ended: boolean;
  error: string | null;
  sendTranscript: (text: string) => void;
}

/**
 * Owns the realtime connection for one room: joins the `rooms` namespace, seeds
 * history from REST, then streams `transcript` / `topicSuggested` / `presence` /
 * `sessionEnded` events.
 */
export function useRoomSocket(roomId: string): RoomSocketState {
  const socketRef = useRef<RoomsSocket | null>(null);
  const [socket, setSocket] = useState<RoomsSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [segments, setSegments] = useState<TranscriptSegment[]>([]);
  const [suggestions, setSuggestions] = useState<TopicSuggestion[]>([]);
  const [presence, setPresence] = useState<Record<string, string | undefined>>({});
  const [endedReport, setEndedReport] = useState<RoomReport | null | undefined>(undefined);
  const [ended, setEnded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let s: RoomsSocket | undefined;

    // Seed history so late joiners see the conversation so far.
    void roomsApi.getTranscript(roomId, 100).then((t) => active && setSegments(t)).catch(() => { });
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

        sock.on("connect", () => {
          setConnected(true);
          sock.emit("joinRoom", { roomId });
        });
        sock.on("disconnect", () => setConnected(false));
        sock.on("transcript", (seg) => setSegments((p) => upsertById(p, seg)));
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
        sock.on("error", (e) => setError(e.message));
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Could not connect"));

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

  return {
    socket,
    connected,
    segments,
    suggestions,
    presence,
    endedReport,
    ended,
    error,
    sendTranscript,
  };
}
