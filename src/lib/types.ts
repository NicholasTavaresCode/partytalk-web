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
  targetIeltsBand?: number;
  createdAt: string;
  updatedAt: string;
}

export interface UpsertProfile {
  displayName: string;
  englishLevel: EnglishLevel;
  targetIeltsBand?: number;
}

/* ================================= Rooms ================================= */

export type RoomStatus = "waiting" | "live" | "ended";
export type SuggestionTrigger = "volume" | "silence" | "manual";

export interface RoomReport {
  summary: string;
  highlights: string[];
  suggestions: string[];
  topicsExplored: string[];
  generatedAt: string;
}

export interface Room {
  id: string;
  topic: string;
  facilitatorPersona: string;
  status: RoomStatus;
  ownerId: string;
  participantIds: string[];
  maxParticipants: number;
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

export interface CreateRoomInput {
  topic: string;
  facilitatorPersona?: string;
  maxParticipants?: number;
  invitedEmails?: string[];
}

export interface TranscriptSegment {
  id: string;
  roomId: string;
  speakerId: string;
  speakerName?: string;
  text: string;
  at: string;
}

export interface TopicSuggestion {
  id: string;
  roomId: string;
  topic: string;
  rationale: string;
  trigger: SuggestionTrigger;
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
  presence: (e: PresenceEvent) => void;
  transcript: (s: TranscriptSegment) => void;
  topicSuggested: (s: TopicSuggestion) => void;
  sessionEnded: (e: SessionEndedEvent) => void;
  error: (e: SocketErrorEvent) => void;
  "webrtc:peers": (e: { uids: string[] }) => void;
  "webrtc:peer-offer": (e: { fromUid: string; sdp: RTCSessionDescriptionInit }) => void;
  "webrtc:peer-answer": (e: { fromUid: string; sdp: RTCSessionDescriptionInit }) => void;
  "webrtc:peer-ice": (e: { fromUid: string; candidate: RTCIceCandidateInit }) => void;
  "webrtc:peer-left": (e: { uid: string }) => void;
  /** Sent to you alone when the owner revokes your invite; you're out of the room and voice. */
  removedFromRoom: (e: { roomId: string }) => void;
  /**
   * The room's REST state changed (someone joined/left, the host started it, an invite
   * was revoked). No data on purpose — refetch `GET /rooms/:id`, which hides owner-only
   * fields per caller.
   */
  roomUpdated: (e: { roomId: string }) => void;
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

/* ============================ IELTS (parked) ============================= */

export type IeltsModuleId = "listening" | "reading" | "writing" | "speaking";

export interface IeltsModuleInfo {
  id: IeltsModuleId;
  title: string;
  duration: string;
  questions: string;
  blurb: string;
  skills: string[];
}

export interface ListeningOption {
  value: string;
  label: string;
}

export interface ListeningMcq {
  n: number;
  prompt: string;
  options: ListeningOption[];
}

export interface ListeningTest {
  part: number;
  instructions: string;
  totalQuestions: number;
  currentQuestion: number;
  answered: number[];
  audio: { title: string; duration: string; note: string };
  form: {
    title: string;
    fields: { n: number; label: string; placeholder: string }[];
    table: { columns: [string, string]; rows: { n: number; item: string; placeholder: string }[] };
  };
  mcqs: ListeningMcq[];
}

export interface ReadingTest {
  passageNumber: number;
  passageTitle: string;
  paragraphs: { label: string; text: string }[];
  questionRange: string;
  headingInstructions: string;
  headings: { numeral: string; text: string }[];
  matches: { n: number; paragraph: string }[];
  totalQuestions: number;
  currentQuestion: number;
}

export interface WritingTask {
  id: 1 | 2;
  label: string;
  minutes: number;
  minWords: number;
  prompt: string;
  emphasis?: string;
  chart?: {
    caption: string;
    unit: string;
    months: string[];
    series: { name: string; color: string; values: number[] }[];
  };
}

export interface SpeakingPart {
  id: number;
  label: string;
  title: string;
  current: { n: number; text: string };
  questions: string[];
  cueCard?: { task: string; bullets: string[] };
}

export interface SpeakingTest {
  examiner: string;
  parts: SpeakingPart[];
  activePart: number;
}
