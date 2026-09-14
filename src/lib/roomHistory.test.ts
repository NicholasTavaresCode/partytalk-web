import { describe, expect, it } from "vitest";
import {
  currentTopic,
  initialRoomState,
  latestHostMessage,
  mergeHistory,
  recentSpeakers,
  roomReducer,
  type RoomState,
} from "./roomHistory";
import type { HostMessage, TranscriptSegment } from "./types";

const seg = (id: string, at: string, text = id): TranscriptSegment => ({
  id,
  roomId: "r1",
  speakerId: "u1",
  speakerName: "Lucas",
  text,
  at,
});

const host = (id: string, at: string, topic = `topic-${id}`): HostMessage => ({
  id,
  roomId: "r1",
  message: `Ok. Now let's talk about ${topic}.`,
  topic,
  reason: "The group has covered this one.",
  trigger: "volume",
  at,
});

const reduce = (actions: Parameters<typeof roomReducer>[1][], from: RoomState = initialRoomState) =>
  actions.reduce(roomReducer, from);

describe("hostMessage handling", () => {
  it("appends a hostMessage from the socket", () => {
    const s = reduce([{ type: "hostMessage", message: host("h1", "2026-09-13T10:00:00Z") }]);
    expect(s.hostMessages.map((m) => m.id)).toEqual(["h1"]);
  });

  it("dedupes by id when the change-topic response and the socket broadcast both arrive", () => {
    const m = host("h1", "2026-09-13T10:00:00Z");
    const s = reduce([
      { type: "hostMessage", message: m }, // REST 201 response
      { type: "hostMessage", message: { ...m } }, // same object broadcast over the socket
    ]);
    expect(s.hostMessages).toHaveLength(1);
  });

  it("unions the REST seed with messages that already arrived live", () => {
    const live = host("h2", "2026-09-13T10:05:00Z");
    const s = reduce([
      { type: "hostMessage", message: live },
      {
        type: "seedHostMessages",
        hostMessages: [host("h1", "2026-09-13T10:00:00Z"), { ...live }],
      },
    ]);
    expect(s.hostMessages.map((m) => m.id)).toEqual(["h1", "h2"]);
  });

  it("derives the current topic from the latest host message by time, not array order", () => {
    const older = host("h1", "2026-09-13T10:00:00Z", "Space travel");
    const newer = host("h2", "2026-09-13T10:07:00Z", "The Usain Bolt record");
    expect(latestHostMessage([newer, older])?.id).toBe("h2");
    expect(currentTopic([newer, older], "Opening")).toBe("The Usain Bolt record");
  });

  it("falls back to the opening topic when the host has not spoken yet", () => {
    expect(currentTopic([], "Weekend plans")).toBe("Weekend plans");
  });
});

describe("merged history", () => {
  it("interleaves host lines with transcript lines by `at`, oldest first", () => {
    const history = mergeHistory(
      [seg("t1", "2026-09-13T10:00:00Z"), seg("t2", "2026-09-13T10:02:00Z"), seg("t3", "2026-09-13T10:04:00Z")],
      [host("h1", "2026-09-13T10:03:00Z")],
    );
    expect(history.map((h) => `${h.kind}:${h.id}`)).toEqual([
      "transcript:t1",
      "transcript:t2",
      "host:h1",
      "transcript:t3",
    ]);
  });

  it("keeps the host message verbatim on the merged item", () => {
    const m = host("h1", "2026-09-13T10:03:00Z", "The Usain Bolt record");
    const [item] = mergeHistory([], [m]);
    expect(item.kind).toBe("host");
    if (item.kind === "host") expect(item.message.message).toBe("Ok. Now let's talk about The Usain Bolt record.");
  });

  it("dedupes transcript segments delivered both by seed and socket", () => {
    const s = reduce([
      { type: "transcript", segment: seg("t2", "2026-09-13T10:02:00Z") },
      { type: "seedTranscript", segments: [seg("t1", "2026-09-13T10:00:00Z"), seg("t2", "2026-09-13T10:02:00Z")] },
    ]);
    expect(s.segments.map((x) => x.id)).toEqual(["t1", "t2"]);
  });
});

describe("other room events", () => {
  it("tracks presence joins and leaves", () => {
    const joined = reduce([{ type: "presence", event: { roomId: "r1", uid: "u2", name: "Mei", event: "joined" } }]);
    expect(joined.presence).toEqual({ u2: "Mei" });
    const left = reduce([{ type: "presence", event: { roomId: "r1", uid: "u2", event: "left" } }], joined);
    expect(left.presence).toEqual({});
  });

  it("marks the session ended with a null report when the AI produced none", () => {
    const s = reduce([{ type: "sessionEnded", event: { roomId: "r1" } }]);
    expect(s.ended).toBe(true);
    expect(s.endedReport).toBeNull();
  });

  it("keeps the report when sessionEnded carries one", () => {
    const report = { summary: "s", highlights: [], suggestions: [], topicsExplored: [], generatedAt: "2026-09-13T11:00:00Z" };
    const s = reduce([{ type: "sessionEnded", event: { roomId: "r1", report } }]);
    expect(s.endedReport).toEqual(report);
  });
});

describe("recentSpeakers", () => {
  const NOW = Date.parse("2026-09-13T10:00:10Z");
  const line = (speakerId: string, secondsAgo: number) => ({
    speakerId,
    at: new Date(NOW - secondsAgo * 1000).toISOString(),
  });

  it("counts people who spoke inside the window and reports the next expiry", () => {
    const { speakers, nextExpiry } = recentSpeakers([line("u1", 1), line("u2", 3), line("u3", 9)], NOW, 4000);
    expect([...speakers].sort()).toEqual(["u1", "u2"]);
    expect(nextExpiry).toBe(NOW - 3000 + 4000);
  });

  it("returns nothing when the room is quiet", () => {
    expect(recentSpeakers([line("u1", 30)], NOW)).toEqual({ speakers: new Set(), nextExpiry: null });
  });
});
