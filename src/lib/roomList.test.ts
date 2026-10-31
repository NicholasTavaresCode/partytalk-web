import { describe, expect, it } from "vitest";
import { isFull, isPendingInvite, roomSections, splitRooms } from "./roomList";
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

describe("roomSections", () => {
  const live = { ...room("live", "me", ["me"]), status: "live" as const };
  const waiting = room("waiting", "me", ["me"]);
  const invite = room("invite", "hana", ["hana"]);
  const justEnded = { ...room("just-ended", "me", ["me"]), status: "ended" as const };
  const past = { ...room("past", "me", ["me"]), status: "ended" as const };
  const ids = (rooms: { id: string }[]) => rooms.map((r) => r.id);

  it("shows everything under All, ended rooms included", () => {
    const out = roomSections([live, waiting, invite], [past], "all", "me");
    expect(ids(out.invites)).toEqual(["invite"]);
    expect(ids(out.mine)).toEqual(["live", "waiting"]);
    expect(ids(out.ended)).toEqual(["past"]);
  });

  it("narrows to one state for Open, Live and Ended", () => {
    expect(ids(roomSections([live, waiting], [past], "waiting", "me").mine)).toEqual(["waiting"]);
    expect(roomSections([live, waiting], [past], "live", "me").ended).toEqual([]);
    const ended = roomSections([live, invite], [past], "ended", "me");
    expect([...ended.invites, ...ended.mine]).toEqual([]);
    expect(ids(ended.ended)).toEqual(["past"]);
  });

  it("drops a room that just ended from the current ones (the ended list has it)", () => {
    expect(ids(roomSections([live, justEnded], [], "all", "me").mine)).toEqual(["live"]);
  });
});
