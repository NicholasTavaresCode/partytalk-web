import { describe, expect, it } from "vitest";
import { replaceRoomInList } from "./queries";
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

describe("replaceRoomInList", () => {
  it("swaps in the updated room where it exists", () => {
    const updated = room("r1", "live", ["u1", "u2"]);
    const out = replaceRoomInList([room("r1"), room("r2")], updated);
    expect(out?.[0]).toBe(updated);
    expect(out?.[1].id).toBe("r2");
  });

  it("leaves a list without that room untouched, and an unloaded list unloaded", () => {
    const list = [room("r2")];
    expect(replaceRoomInList(list, room("r1"))).toBe(list);
    expect(replaceRoomInList(undefined, room("r1"))).toBeUndefined();
  });
});
