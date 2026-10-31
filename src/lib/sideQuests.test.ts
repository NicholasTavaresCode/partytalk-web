import { describe, expect, it } from "vitest";
import { roomQuestChanges, splitQuests } from "./sideQuests";
import type { SideQuest } from "./types";

const quest = (id: string, over: Partial<SideQuest> = {}): SideQuest => ({
  id,
  title: `Quest ${id}`,
  detail: "Why and how.",
  skill: "fluency",
  status: "open",
  createdAt: "2026-10-31T18:00:00Z",
  createdInRoomId: "old",
  ...over,
});

describe("splitQuests", () => {
  it("separates open from completed, keeping the order", () => {
    const list = [quest("o1"), quest("o2"), quest("d1", { status: "done" })];
    const { open, done } = splitQuests(list);
    expect(open.map((q) => q.id)).toEqual(["o1", "o2"]);
    expect(done.map((q) => q.id)).toEqual(["d1"]);
  });
});

describe("roomQuestChanges", () => {
  it("finds what one room added and what it checked off", () => {
    const list = [
      quest("new", { createdInRoomId: "r1" }),
      quest("new-and-done", { createdInRoomId: "r1", status: "done", doneInRoomId: "r2" }),
      quest("done-here", { status: "done", doneInRoomId: "r1" }),
      quest("elsewhere"),
    ];
    const { added, completed } = roomQuestChanges(list, "r1");
    expect(added.map((q) => q.id)).toEqual(["new", "new-and-done"]);
    expect(completed.map((q) => q.id)).toEqual(["done-here"]);
  });
});
