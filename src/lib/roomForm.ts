import type { CreateRoomInput, RoomDuration } from "./types";

export interface CreateRoomForm {
  topic: string;
  hostPicksTopic: boolean;
  maxParticipants: number;
  durationMinutes: RoomDuration;
  invitedEmails: string[];
}

/**
 * Turn the create-room form into the request body, or null if it can't be
 * submitted yet. With `hostPicksTopic` the topic is omitted entirely (the API
 * ignores it anyway); without it a non-blank topic is required.
 */
export function buildCreateRoomInput(form: CreateRoomForm): CreateRoomInput | null {
  const { maxParticipants, durationMinutes, invitedEmails } = form;
  if (form.hostPicksTopic) return { hostPicksTopic: true, maxParticipants, durationMinutes, invitedEmails };
  const topic = form.topic.trim();
  if (!topic) return null;
  return { topic, maxParticipants, durationMinutes, invitedEmails };
}
