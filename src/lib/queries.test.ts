import { describe, expect, it } from "vitest";
import { mergeRoom, replaceRoomInList } from "./queries";
import type { Room } from "./types";

const room = (id: string, status: Room["status"] = "waiting", participantIds = ["u1"]): Room => ({
  id,
  topic: "t",
  status,
  ownerId: "u1",
  participantIds,
  maxParticipants: 5,
  durationMinutes: 30,
  createdAt: "2026-09-13T10:00:00Z",
  updatedAt: "2026-09-13T10:00:00Z",
});

describe("mergeRoom", () => {
  it("keeps the owner's invite state when a non-owner view arrives over the socket", () => {
    const cached = { ...room("r1"), invitedEmails: ["bo@example.com"], inviteCode: "code" };
    const pushed = room("r1", "live", ["u1", "u2"]);
    expect(mergeRoom(cached, pushed)).toEqual({ ...pushed, invitedEmails: ["bo@example.com"], inviteCode: "code" });
  });

  it("lets fields that are present win, including a link turned off", () => {
    const cached = { ...room("r1"), inviteCode: "code" };
    expect(mergeRoom(cached, { ...room("r1"), inviteCode: null }).inviteCode).toBeNull();
    expect(mergeRoom(undefined, room("r1"))).toEqual(room("r1"));
  });
});

describe("replaceRoomInList", () => {
  it("merges the updated room in where it exists", () => {
    const updated = room("r1", "live", ["u1", "u2"]);
    const out = replaceRoomInList([room("r1"), room("r2")], updated);
    expect(out?.[0]).toEqual(updated);
    expect(out?.[1].id).toBe("r2");
  });

  it("leaves a list without that room untouched, and an unloaded list unloaded", () => {
    const list = [room("r2")];
    expect(replaceRoomInList(list, room("r1"))).toBe(list);
    expect(replaceRoomInList(undefined, room("r1"))).toBeUndefined();
  });
});
