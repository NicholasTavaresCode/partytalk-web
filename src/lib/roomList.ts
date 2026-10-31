import type { Room, RoomStatus } from "./types";

export type RoomFilter = "all" | RoomStatus;

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

/**
 * What the rooms page shows under a filter. `open` is `GET /rooms` (waiting and
 * live; it can briefly hold a room you just ended, which is dropped here) and
 * `ended` is `GET /rooms?status=ended`. "All" means everything: invitations,
 * your current rooms, then past ones.
 */
export function roomSections(
  open: Room[],
  ended: Room[],
  filter: RoomFilter,
  uid: string,
): { invites: Room[]; mine: Room[]; ended: Room[] } {
  const current =
    filter === "ended"
      ? []
      : open.filter((r) => r.status !== "ended" && (filter === "all" || r.status === filter));
  return {
    ...splitRooms(current, uid),
    ended: filter === "all" || filter === "ended" ? ended : [],
  };
}
