import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FRESH_WINDOW_MS } from "./hostVoice";
import { REVEAL_DELAY_MS, createTopicReveal } from "./topicReveal";
import type { HostMessage } from "./types";

const NOW = Date.parse("2026-10-31T10:00:00Z");

const host = (id: string, offsetMs = 0): HostMessage => ({
  id,
  roomId: "r1",
  message: `Ok. Now let's talk about ${id}.`,
  topic: id,
  reason: "Enough on that one.",
  trigger: "volume",
  at: new Date(NOW + offsetMs).toISOString(),
});

const shown = (reveal: ReturnType<typeof createTopicReveal>) => [...reveal.getSnapshot().shown];

describe("topic reveal", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });
  afterEach(() => vi.useRealTimers());

  it("counts down before showing a new line", () => {
    const reveal = createTopicReveal();
    reveal.onMessages([host("h1")]);

    expect(shown(reveal)).toEqual([]);
    expect(reveal.getSnapshot().incoming).toEqual({ message: host("h1"), at: NOW + REVEAL_DELAY_MS });

    vi.advanceTimersByTime(REVEAL_DELAY_MS - 1);
    expect(shown(reveal)).toEqual([]);
    vi.advanceTimersByTime(1);
    expect(shown(reveal)).toEqual(["h1"]);
    expect(reveal.getSnapshot().incoming).toBeNull();
    expect(reveal.getSnapshot().revealed).toBe("h1");
  });

  it("shows history at once, without calling it revealed", () => {
    const reveal = createTopicReveal();
    reveal.onMessages([host("old", -(FRESH_WINDOW_MS + 1000)), host("older", -60_000)]);

    expect(shown(reveal).sort()).toEqual(["old", "older"]);
    expect(reveal.getSnapshot().incoming).toBeNull();
    expect(reveal.getSnapshot().revealed).toBeNull();
  });

  it("counts down to each new line once, oldest first", () => {
    const reveal = createTopicReveal();
    reveal.onMessages([host("h2", -500), host("h1", -1000)]);
    reveal.onMessages([host("h1", -1000), host("h2", -500)]);

    expect(reveal.getSnapshot().incoming?.message.id).toBe("h1");
    vi.advanceTimersByTime(REVEAL_DELAY_MS);
    expect(shown(reveal)).toEqual(["h1"]);
    expect(reveal.getSnapshot().incoming?.message.id).toBe("h2");
    vi.advanceTimersByTime(REVEAL_DELAY_MS);
    expect(shown(reveal)).toEqual(["h1", "h2"]);
  });

  it("notifies subscribers on every change", () => {
    const reveal = createTopicReveal();
    const listener = vi.fn();
    const unsubscribe = reveal.subscribe(listener);

    reveal.onMessages([host("h1")]);
    vi.advanceTimersByTime(REVEAL_DELAY_MS);
    expect(listener).toHaveBeenCalledTimes(2);

    unsubscribe();
    reveal.onMessages([host("h2")]);
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("restarts a stopped countdown on the next update (React's strict-mode remount)", () => {
    const reveal = createTopicReveal();
    reveal.onMessages([host("h1")]);
    vi.advanceTimersByTime(1000);
    reveal.stop();

    expect(reveal.getSnapshot().incoming).toBeNull();
    vi.advanceTimersByTime(REVEAL_DELAY_MS);
    expect(shown(reveal)).toEqual([]);

    reveal.onMessages([host("h1")]);
    expect(reveal.getSnapshot().incoming?.message.id).toBe("h1");
    vi.advanceTimersByTime(REVEAL_DELAY_MS);
    expect(shown(reveal)).toEqual(["h1"]);
  });
});
