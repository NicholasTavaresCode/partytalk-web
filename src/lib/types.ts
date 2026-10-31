/* ================================= User ================================== */

/**
 * `GET /users/me`. The API creates the record on first sign-in with the Google
 * name as `displayName`; an account without a name has none, and `ProfileGate`
 * asks for one (see `hasProfile`).
 */
export interface User {
  id: string;
  email: string;
  displayName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UpsertProfile {
  displayName: string;
}

/* ============================== Side quests ============================== */

/** What a quest trains; the host only sees a transcript, so no pronunciation. */
export type QuestSkill = "grammar" | "vocabulary" | "fluency" | "interaction";

/** Open quests a learner can hold at once (mirrors the API's MAX_OPEN_QUESTS). */
export const MAX_OPEN_QUESTS = 20;

/**
 * A personal, topic-independent goal the AI host set after a room
 * (`GET /users/me/side-quests`). Read-only: the host adds quests when a room
 * ends and marks them done when the learner shows they've got them.
 */
export interface SideQuest {
  id: string;
  title: string;
  detail: string;
  skill: QuestSkill;
  status: "open" | "done";
  createdAt: string;
  createdInRoomId: string;
  doneAt?: string;
  doneInRoomId?: string;
  /** What the host noticed that showed the quest was done. */
  doneNote?: string;
}

/* ================================= Rooms ================================= */

export type RoomStatus = "waiting" | "live" | "ended";

/** The only session lengths the API accepts (minutes). Default 30. */
export const ROOM_DURATIONS = [5, 10, 15, 30, 45, 60] as const;
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
  /** The owner's display name at creation, for "Hana invited you". Absent on older rooms. */
  ownerName?: string;
  participantIds: string[];
  maxParticipants: number;
  /** Session length in minutes (one of ROOM_DURATIONS). */
  durationMinutes: number;
  /** Set when the owner starts the room. */
  startedAt?: string;
  /** startedAt + durationMinutes. The backend ends the session itself at this time and emits `sessionEnded`. */
  scheduledEndAt?: string;
  /** Lowercased emails allowed in (rooms are invite-only). Present only for the owner. */
  invitedEmails?: string[];
  /** Invite-link secret (`/practice/{id}?invite={code}`); `null` when off. Owner only. */
  inviteCode?: string | null;
  report?: RoomReport;
  createdAt: string;
  updatedAt: string;
  endedAt?: string;
}

/** `GET /rooms/:id/ice-servers` — passed straight to `new RTCPeerConnection`. */
export interface IceServers {
  iceServers: RTCIceServer[];
  /** Seconds until the TURN credential expires (re-fetched on every reconnect). */
  ttlSeconds: number;
}

interface CreateRoomOptions {
  maxParticipants?: number;
  /** 5 | 10 | 15 | 30 | 45 | 60; the API defaults to 30. */
  durationMinutes?: RoomDuration;
  /** Google accounts allowed in besides the owner; each gets an email with the link. */
  invitedEmails?: string[];
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
 * backend's `docs/audio-architecture.md` (P2P mesh, milestone M1), relayed by
 * its RoomsGateway. `webrtc:peer-left` fires when a voice member leaves or
 * disconnects.
 */
export interface ServerToClientEvents {
  /**
   * The full Room, sent to everyone already in the socket room whenever someone
   * joins/leaves over REST, the owner starts it or revokes an invite. It is the
   * non-owner view (no `invitedEmails` / `inviteCode`), so it is merged into the
   * cached room rather than replacing it. The actor gets the Room in the REST
   * response instead, and both go through `useApplyRoom`.
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
  "webrtc:peer-left": (e: { uid: string }) => void;
  /** Sent to you alone when the owner revokes your invite; you're out of the room and voice. */
  removedFromRoom: (e: { roomId: string }) => void;
  /** Sent to you alone on `joinRoom`: everyone connected right now, one entry per person. */
  roster: (e: { roomId: string; members: { uid: string; name?: string }[] }) => void;
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
