import type {
  HostMessage,
  PresenceEvent,
  RoomReport,
  SessionEndedEvent,
  TranscriptSegment,
} from "./types";

/* ------------------------------ List helpers ----------------------------- */

/** Append `item` unless an entry with the same id already exists (first wins). */
export function upsertById<T extends { id: string }>(list: T[], item: T): T[] {
  if (list.some((x) => x.id === item.id)) return list;
  return [...list, item];
}

/** Union of a REST seed and anything already received live, deduped by id. */
export function mergeById<T extends { id: string }>(seed: T[], live: T[]): T[] {
  return live.reduce<T[]>((acc, item) => upsertById(acc, item), [...seed]);
}

function timeOf(iso: string): number {
  const t = Date.parse(iso);
  return Number.isNaN(t) ? 0 : t;
}

function byAt<T extends { at: string; id: string }>(a: T, b: T): number {
  return timeOf(a.at) - timeOf(b.at) || a.at.localeCompare(b.at) || a.id.localeCompare(b.id);
}

/* ------------------------------ Conversation ----------------------------- */

/** One line of the conversation view: something a person said, or the host spoke. */
export type HistoryItem =
  | { kind: "transcript"; id: string; at: string; segment: TranscriptSegment }
  | { kind: "host"; id: string; at: string; message: HostMessage };

/** Transcript and host lines interleaved by `at`, oldest first. */
export function mergeHistory(segments: TranscriptSegment[], hostMessages: HostMessage[]): HistoryItem[] {
  const items: HistoryItem[] = [
    ...segments.map((s): HistoryItem => ({ kind: "transcript", id: s.id, at: s.at, segment: s })),
    ...hostMessages.map((m): HistoryItem => ({ kind: "host", id: m.id, at: m.at, message: m })),
  ];
  return items.sort(byAt);
}

/** The most recent host message by `at` (order of the input does not matter). */
export function latestHostMessage(hostMessages: HostMessage[]): HostMessage | undefined {
  return hostMessages.reduce<HostMessage | undefined>(
    (best, m) => (best === undefined || byAt(m, best) > 0 ? m : best),
    undefined,
  );
}

/** The topic the room is on now: the latest host message's topic, else the opening topic. */
export function currentTopic(hostMessages: HostMessage[], openingTopic: string): string {
  return latestHostMessage(hostMessages)?.topic ?? openingTopic;
}

/* ------------------------------- Speaking -------------------------------- */

/** How long a person counts as "talking" after their last transcript line. */
export const RECENT_SPEECH_MS = 4000;

/**
 * Speaker ids with a transcript line inside the window — the fallback speaking
 * signal for peers whose audio we can't meter (no WebRTC stream yet).
 * Returns the time at which the earliest of them expires, for rescheduling.
 */
export function recentSpeakers(
  segments: { speakerId: string; at: string }[],
  now: number,
  windowMs = RECENT_SPEECH_MS,
): { speakers: Set<string>; nextExpiry: number | null } {
  const speakers = new Set<string>();
  let nextExpiry: number | null = null;
  for (const s of segments) {
    const expires = timeOf(s.at) + windowMs;
    if (expires > now && timeOf(s.at) <= now + windowMs) {
      speakers.add(s.speakerId);
      nextExpiry = nextExpiry === null ? expires : Math.min(nextExpiry, expires);
    }
  }
  return { speakers, nextExpiry };
}

/* -------------------------------- Reducer -------------------------------- */

export interface RoomState {
  connected: boolean;
  segments: TranscriptSegment[];
  hostMessages: HostMessage[];
  /**
   * uid → display name for participants whose socket is currently subscribed
   * (name known only for peers seen joining this session). This is *online*
   * status only — membership is `Room.participantIds`.
   */
  presence: Record<string, string | undefined>;
  ended: boolean;
  /** The owner revoked this user's invite; the server already dropped them from the room. */
  removed: boolean;
  /** undefined = not ended; null = ended without a report (the AI failed). */
  endedReport: RoomReport | null | undefined;
  error: string | null;
}

export const initialRoomState: RoomState = {
  connected: false,
  segments: [],
  hostMessages: [],
  presence: {},
  ended: false,
  removed: false,
  endedReport: undefined,
  error: null,
};

export type RoomAction =
  | { type: "connected"; connected: boolean }
  | { type: "seedTranscript"; segments: TranscriptSegment[] }
  | { type: "seedHostMessages"; hostMessages: HostMessage[] }
  | { type: "transcript"; segment: TranscriptSegment }
  | { type: "hostMessage"; message: HostMessage }
  | { type: "presence"; event: PresenceEvent }
  /** Everyone connected when we (re)joined: replaces what we knew. */
  | { type: "roster"; members: { uid: string; name?: string }[] }
  | { type: "removed" }
  | { type: "sessionEnded"; event: SessionEndedEvent }
  | { type: "error"; message: string | null };

/** Pure state machine for one room's realtime stream (socket events + REST seeds). */
export function roomReducer(state: RoomState, action: RoomAction): RoomState {
  switch (action.type) {
    case "connected":
      return { ...state, connected: action.connected };
    case "seedTranscript":
      return { ...state, segments: mergeById(action.segments, state.segments) };
    case "seedHostMessages":
      return { ...state, hostMessages: mergeById(action.hostMessages, state.hostMessages) };
    case "transcript":
      return { ...state, segments: upsertById(state.segments, action.segment) };
    case "hostMessage":
      return { ...state, hostMessages: upsertById(state.hostMessages, action.message) };
    case "presence": {
      const { uid, name, event } = action.event;
      if (event === "left") {
        const next = { ...state.presence };
        delete next[uid];
        return { ...state, presence: next };
      }
      return { ...state, presence: { ...state.presence, [uid]: name ?? state.presence[uid] } };
    }
    case "roster":
      return { ...state, presence: Object.fromEntries(action.members.map((m) => [m.uid, m.name])) };
    case "removed":
      return { ...state, removed: true };
    case "sessionEnded":
      return { ...state, ended: true, endedReport: action.event.report ?? null };
    case "error":
      return { ...state, error: action.message };
  }
}
