import { api } from "@/lib/apiClient";
import type { CreateRoomInput, Room, TopicSuggestion, TranscriptSegment } from "@/lib/types";

const qs = (limit?: number) => (limit ? `?limit=${limit}` : "");

export const roomsApi = {
  list: (limit?: number) => api.get<Room[]>(`/rooms${qs(limit)}`),
  get: (id: string) => api.get<Room>(`/rooms/${id}`),
  create: (input: CreateRoomInput) => api.post<Room>("/rooms", input),
  join: (id: string) => api.post<Room>(`/rooms/${id}/join`),
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
};
