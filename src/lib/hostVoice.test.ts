import { describe, expect, it, vi } from "vitest";
import { FRESH_WINDOW_MS, createHostSpeaker, type SpeechOutput } from "./hostVoice";
import type { HostMessage } from "./types";

const NOW = Date.parse("2026-09-13T10:00:00Z");

const host = (id: string, offsetMs = 0, message = `Ok. Now let's talk about ${id}.`): HostMessage => ({
  id,
  roomId: "r1",
  message,
  topic: id,
  reason: "Enough on that one.",
  trigger: "silence",
  at: new Date(NOW + offsetMs).toISOString(),
});

function fakeOutput() {
  const spoken: string[] = [];
  const output: SpeechOutput = {
    speak: vi.fn((text: string) => {
      spoken.push(text);
    }),
    cancel: vi.fn(),
  };
  return { output, spoken };
}

const make = (output: SpeechOutput | null, muted = false) =>
  createHostSpeaker({ output, muted, now: () => NOW });

describe("host speaker", () => {
  it("speaks a new host message verbatim, exactly once", () => {
    const { output, spoken } = fakeOutput();
    const speaker = make(output);
    const m = host("h1", 1000, "Ok. Now let's talk about the Usain Bolt record.");
    expect(speaker.onMessages([m]).map((x) => x.id)).toEqual(["h1"]);
    expect(speaker.onMessages([m])).toEqual([]);
    expect(spoken).toEqual(["Ok. Now let's talk about the Usain Bolt record."]);
  });

  it("speaks only the messages it has not seen, in order", () => {
    const { output, spoken } = fakeOutput();
    const speaker = make(output);
    speaker.onMessages([host("h1", 1000)]);
    speaker.onMessages([host("h1", 1000), host("h2", 2000), host("h3", 3000)]);
    expect(spoken).toHaveLength(3);
    expect(spoken[2]).toContain("h3");
  });

  it("never reads seeded history aloud", () => {
    const { output, spoken } = fakeOutput();
    const speaker = make(output);
    const old = host("old", -(FRESH_WINDOW_MS + 1000));
    const recent = host("recent", -1000);
    expect(speaker.onMessages([old, recent]).map((x) => x.id)).toEqual(["recent"]);
    expect(spoken).toHaveLength(1);
  });

  it("stays silent while muted and does not replay the backlog when unmuted", () => {
    const { output, spoken } = fakeOutput();
    const speaker = make(output, true);
    speaker.onMessages([host("h1", 1000)]);
    speaker.setMuted(false);
    speaker.onMessages([host("h1", 1000)]);
    expect(spoken).toEqual([]);
    speaker.onMessages([host("h1", 1000), host("h2", 2000)]);
    expect(spoken).toHaveLength(1);
  });

  it("cancels in-flight speech when muted", () => {
    const { output } = fakeOutput();
    const speaker = make(output);
    speaker.onMessages([host("h1", 1000)]);
    speaker.setMuted(true);
    expect(output.cancel).toHaveBeenCalledTimes(1);
  });

  it("is a no-op without speech support", () => {
    const speaker = make(null);
    expect(speaker.onMessages([host("h1", 1000)])).toEqual([]);
  });
});
