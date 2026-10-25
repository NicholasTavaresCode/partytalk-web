import { api } from "@/lib/apiClient";
import type { CreateRoomInput, IceServers, Room, TopicSuggestion, TranscriptSegment } from "@/lib/types";

const qs = (limit?: number) => (limit ? `?limit=${limit}` : "");

export const roomsApi = {
  list: (limit?: number) => api.get<Room[]>(`/rooms${qs(limit)}`),
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
  getSuggestions: (id: string, limit?: number) =>
    api.get<TopicSuggestion[]>(`/rooms/${id}/suggestions${qs(limit)}`),
  suggestTopic: (id: string) => api.post<TopicSuggestion>(`/rooms/${id}/suggest-topic`),
  /** STUN + (when configured) TURN with a short-lived credential; seated participants only. */
  iceServers: (id: string) => api.get<IceServers>(`/rooms/${id}/ice-servers`),
  // Owner-only invite management.
  addInvites: (id: string, emails: string[]) => api.post<Room>(`/rooms/${id}/invites`, { emails }),
  revokeInvite: (id: string, email: string) =>
    api.delete<Room>(`/rooms/${id}/invites/${encodeURIComponent(email)}`),
  createInviteLink: (id: string) => api.post<Room>(`/rooms/${id}/invite-link`),
  disableInviteLink: (id: string) => api.delete<Room>(`/rooms/${id}/invite-link`),
};
