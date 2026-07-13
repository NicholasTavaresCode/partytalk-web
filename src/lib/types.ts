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
  report?: RoomReport;
  createdAt: string;
  updatedAt: string;
  endedAt?: string;
}

export interface CreateRoomInput {
  topic: string;
  facilitatorPersona?: string;
  maxParticipants?: number;
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
 * backend's `docs/audio-architecture.md` (P2P mesh, milestone M1). Those relays
 * are not yet implemented server-side; event names may need minor reconciliation
 * when the backend ships signaling.
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
