import { describe, expect, it } from "vitest";
import { isFull, isPendingInvite, splitRooms } from "./roomList";
import type { Room } from "./types";

const room = (id: string, ownerId: string, participantIds: string[], maxParticipants = 5): Room => ({
  id,
  topic: "t",
  status: "waiting",
  ownerId,
  participantIds,
  maxParticipants,
  durationMinutes: 30,
  createdAt: "2026-10-31T10:00:00Z",
  updatedAt: "2026-10-31T10:00:00Z",
});

describe("splitRooms", () => {
  it("puts invitations you haven't accepted apart from rooms you own or joined", () => {
    const mine = room("mine", "me", ["me"]);
    const accepted = room("accepted", "hana", ["hana", "me"]);
    const invite = room("invite", "hana", ["hana"]);
    const out = splitRooms([mine, invite, accepted], "me");
    expect(out.invites.map((r) => r.id)).toEqual(["invite"]);
    expect(out.mine.map((r) => r.id)).toEqual(["mine", "accepted"]);
  });
});

describe("isPendingInvite / isFull", () => {
  it("is never an invite to your own room", () => {
    expect(isPendingInvite(room("r", "me", []), "me")).toBe(false);
  });

  it("knows when every seat is taken", () => {
    expect(isFull(room("r", "hana", ["hana", "bo"], 2))).toBe(true);
    expect(isFull(room("r", "hana", ["hana"], 2))).toBe(false);
  });
});
