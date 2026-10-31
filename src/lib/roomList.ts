import type { Room } from "./types";

/** Invited, but no seat yet: shown under Invitations with an Accept button. */
export function isPendingInvite(room: Room, uid: string): boolean {
  return room.ownerId !== uid && !room.participantIds.includes(uid);
}

export function isFull(room: Room): boolean {
  return room.participantIds.length >= room.maxParticipants;
}

/**
 * Split `GET /rooms` (rooms you own or are invited to) into invitations you
 * haven't accepted and rooms you're in, each keeping the API's order.
 */
export function splitRooms(rooms: Room[], uid: string): { invites: Room[]; mine: Room[] } {
  return {
    invites: rooms.filter((r) => isPendingInvite(r, uid)),
    mine: rooms.filter((r) => !isPendingInvite(r, uid)),
  };
}
