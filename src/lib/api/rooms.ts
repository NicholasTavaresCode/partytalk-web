import { api } from "@/lib/apiClient";
import type {
  CreateRoomInput,
  HostMessage,
  IceServers,
  Room,
  RoomStatus,
  TranscriptSegment,
} from "@/lib/types";

const qs = (limit?: number) => (limit ? `?limit=${limit}` : "");

export const roomsApi = {
  /** Rooms you own or are invited to: the open ones, or only `status` (e.g. "ended", most recently ended first). */
  list: (limit?: number, status?: RoomStatus) =>
    api.get<Room[]>(`/rooms${qs(limit)}${status ? `${limit ? "&" : "?"}status=${status}` : ""}`),
  get: (id: string) => api.get<Room>(`/rooms/${id}`),
  create: (input: CreateRoomInput) => api.post<Room>("/rooms", input),
  /** `inviteCode` (from an invite link) admits a caller who isn't on the invite list yet. */
  join: (id: string, inviteCode?: string) =>
    api.post<Room>(`/rooms/${id}/join`, inviteCode ? { inviteCode } : undefined),
  leave: (id: string) => api.post<Room>(`/rooms/${id}/leave`),
  start: (id: string) => api.post<Room>(`/rooms/${id}/start`),
  end: (id: string) => api.post<Room>(`/rooms/${id}/end`),
  getTranscript: (id: string, limit?: number) =>
    api.get<TranscriptSegment[]>(`/rooms/${id}/transcript${qs(limit)}`),
  postTranscript: (id: string, text: string, speakerName?: string) =>
    api.post<TranscriptSegment>(`/rooms/${id}/transcript`, { text, speakerName }),
  /** Oldest first. Default limit 20, max 100. */
  getHostMessages: (id: string, limit?: number) =>
    api.get<HostMessage[]>(`/rooms/${id}/host-messages${qs(limit)}`),
  /** A host line as MP3 in the host's voice; 503 when the API has no voice (use the browser's then). */
  hostSpeech: (id: string, messageId: string) => api.blob(`/rooms/${id}/host-messages/${messageId}/speech`),
  /** Owner only: asks the host to change topic now; the same message is also broadcast over the socket. */
  changeTopic: (id: string) => api.post<HostMessage>(`/rooms/${id}/change-topic`),
  /** STUN + (when configured) TURN with a short-lived credential; seated participants only. */
  iceServers: (id: string) => api.get<IceServers>(`/rooms/${id}/ice-servers`),
  // Owner-only invite management; each returns the room with its full invite state.
  addInvites: (id: string, emails: string[]) => api.post<Room>(`/rooms/${id}/invites`, { emails }),
  revokeInvite: (id: string, email: string) =>
    api.delete<Room>(`/rooms/${id}/invites/${encodeURIComponent(email)}`),
  createInviteLink: (id: string) => api.post<Room>(`/rooms/${id}/invite-link`),
  disableInviteLink: (id: string) => api.delete<Room>(`/rooms/${id}/invite-link`),
};
