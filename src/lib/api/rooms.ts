import { api } from "@/lib/apiClient";
import type { CreateRoomInput, HostMessage, Room, TranscriptSegment } from "@/lib/types";

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
  /** Oldest first. Default limit 20, max 100. */
  getHostMessages: (id: string, limit?: number) =>
    api.get<HostMessage[]>(`/rooms/${id}/host-messages${qs(limit)}`),
  /** Asks the host to change topic now; the same message is also broadcast over the socket. */
  changeTopic: (id: string) => api.post<HostMessage>(`/rooms/${id}/change-topic`),
};
