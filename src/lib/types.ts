/* ================================ Shared ================================= */

export type EnglishLevel =
  | "beginner"
  | "elementary"
  | "intermediate"
  | "upper-intermediate"
  | "advanced";

/* ================================= User ================================== */

export interface User {
  id: string;
  email: string;
  displayName: string;
  englishLevel: EnglishLevel;
  createdAt: string;
  updatedAt: string;
}

export interface UpsertProfile {
  displayName: string;
  englishLevel: EnglishLevel;
}

/* ================================= Rooms ================================= */

export type RoomStatus = "waiting" | "live" | "ended";

/** The only session lengths the API accepts (minutes). Default 30. */
export const ROOM_DURATIONS = [10, 15, 30, 45, 60] as const;
export type RoomDuration = (typeof ROOM_DURATIONS)[number];
export type HostMessageTrigger = "volume" | "silence" | "manual";

export interface RoomReport {
  summary: string;
  highlights: string[];
  suggestions: string[];
  topicsExplored: string[];
  generatedAt: string;
}

export interface Room {
  id: string;
  /** The OPENING topic only. The current topic is the `topic` of the latest `HostMessage`. */
  topic: string;
  /** True when the AI host chose the opening topic (`hostPicksTopic` at creation). */
  topicPickedByHost?: boolean;
  status: RoomStatus;
  ownerId: string;
  participantIds: string[];
  maxParticipants: number;
  /** Session length in minutes (one of ROOM_DURATIONS). */
  durationMinutes: number;
  /** Set when the owner starts the room. */
  startedAt?: string;
  /** startedAt + durationMinutes. The backend ends the session itself at this time and emits `sessionEnded`. */
  scheduledEndAt?: string;
  report?: RoomReport;
  createdAt: string;
  updatedAt: string;
  endedAt?: string;
}

interface CreateRoomOptions {
  maxParticipants?: number;
  /** 10 | 15 | 30 | 45 | 60; the API defaults to 30. */
  durationMinutes?: RoomDuration;
}

/**
 * Either the creator types the opening topic, or `hostPicksTopic: true` asks the
 * AI host to choose one — in which case `topic` must be omitted (the API ignores
 * it) and the call can fail with 503 if the host can't pick right now.
 */
export type CreateRoomInput =
  | (CreateRoomOptions & { topic: string; hostPicksTopic?: false })
  | (CreateRoomOptions & { hostPicksTopic: true; topic?: undefined });

export interface TranscriptSegment {
  id: string;
  roomId: string;
  speakerId: string;
  speakerName?: string;
  text: string;
  at: string;
}

/**
 * A line the AI host spoke to move the group on to a new topic. Arrives over the
 * socket as `hostMessage` and from `POST /rooms/:id/change-topic`, which returns
 * the same object it broadcasts — so always dedupe by `id`.
 */
export interface HostMessage {
  id: string;
  roomId: string;
  /** The exact sentence the host says. */
  message: string;
  /** The new topic the group is now on. */
  topic: string;
  /** Short note on why the host stepped in now. */
  reason: string;
  trigger: HostMessageTrigger;
  at: string;
}

/* ==================== Socket.IO — `rooms` namespace ====================== */

export interface PresenceEvent {
  roomId: string;
  uid: string;
  name?: string;
  event: "joined" | "left";
}

export interface SessionEndedEvent {
  roomId: string;
  report?: RoomReport;
}

export interface SocketErrorEvent {
  message: string;
}

/**
 * Server → client events. The `webrtc:*` relays follow the contract in the
 * backend's `docs/audio-architecture.md` (P2P mesh, milestone M1). Those relays
 * are not yet implemented server-side; event names may need minor reconciliation
 * when the backend ships signaling.
 */
export interface ServerToClientEvents {
  /**
   * The full Room, sent to everyone already in the socket room whenever someone
   * joins/leaves over REST or the owner starts it. Replaces local room state
   * (participants, status, scheduledEndAt). The actor gets the same Room in the
   * REST response instead, so both sources are applied identically.
   */
  roomUpdated: (room: Room) => void;
  /** A socket subscribed/unsubscribed — NOT membership; the member list is `Room.participantIds`. */
  presence: (e: PresenceEvent) => void;
  transcript: (s: TranscriptSegment) => void;
  hostMessage: (m: HostMessage) => void;
  sessionEnded: (e: SessionEndedEvent) => void;
  error: (e: SocketErrorEvent) => void;
  "webrtc:peers": (e: { uids: string[] }) => void;
  "webrtc:peer-offer": (e: { fromUid: string; sdp: RTCSessionDescriptionInit }) => void;
  "webrtc:peer-answer": (e: { fromUid: string; sdp: RTCSessionDescriptionInit }) => void;
  "webrtc:peer-ice": (e: { fromUid: string; candidate: RTCIceCandidateInit }) => void;
}

export interface ClientToServerEvents {
  joinRoom: (p: { roomId: string }) => void;
  leaveRoom: (p: { roomId: string }) => void;
  transcript: (p: { roomId: string; text: string }) => void;
  "webrtc:join": (p: { roomId: string }) => void;
  "webrtc:offer": (p: { roomId: string; toUid: string; sdp: RTCSessionDescriptionInit }) => void;
  "webrtc:answer": (p: { roomId: string; toUid: string; sdp: RTCSessionDescriptionInit }) => void;
  "webrtc:ice": (p: { roomId: string; toUid: string; candidate: RTCIceCandidateInit }) => void;
}
