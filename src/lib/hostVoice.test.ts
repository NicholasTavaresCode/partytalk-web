import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "./apiClient";
import {
  FRESH_WINDOW_MS,
  apiSpeechOutput,
  createHostSpeaker,
  pickHostVoice,
  type SpeechOutput,
  type VoiceInfo,
} from "./hostVoice";
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
    speak: vi.fn((m: HostMessage) => {
      spoken.push(m.message);
    }),
    prefetch: vi.fn(),
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

const voice = (name: string, lang: string, localService = true, voiceURI = name): VoiceInfo => ({
  name,
  lang,
  localService,
  voiceURI,
});

describe("pickHostVoice", () => {
  it("prefers Chrome's Google voice over Linux's eSpeak default", () => {
    const voices = [
      voice("English (America)", "en-US", true, "espeak-ng English (America)"),
      voice("Google Deutsch", "de-DE", false),
      voice("Google UK English Female", "en-GB", false),
      voice("Google US English", "en-US", false),
    ];
    expect(pickHostVoice(voices)?.name).toBe("Google US English");
  });

  it("prefers Edge's natural voices over its older local ones", () => {
    const voices = [
      voice("Microsoft David - English (United States)", "en-US"),
      voice("Microsoft Zira - English (United States)", "en-US"),
      voice("Microsoft Aria Online (Natural) - English (United States)", "en-US", false),
    ];
    expect(pickHostVoice(voices)?.name).toContain("Aria Online (Natural)");
  });

  it("prefers Apple's premium voices and never picks a novelty one", () => {
    const voices = [
      voice("Zarvox", "en-US"),
      voice("Bad News", "en-US"),
      voice("Samantha", "en-US"),
      voice("Ava (Premium)", "en-US"),
    ];
    expect(pickHostVoice(voices)?.name).toBe("Ava (Premium)");
    expect(pickHostVoice(voices.slice(0, 3))?.name).toBe("Samantha");
  });

  it("takes Android's network voices over its local ones", () => {
    const voices = [
      voice("English United States", "en-US", true, "en-us-x-sfg-local"),
      voice("English United States", "en_US", false, "en-us-x-iob-network"),
    ];
    expect(pickHostVoice(voices)?.voiceURI).toBe("en-us-x-iob-network");
  });

  it("returns null when there is no English voice (or no list yet)", () => {
    expect(pickHostVoice([voice("Google Deutsch", "de-DE", false)])).toBeNull();
    expect(pickHostVoice([])).toBeNull();
  });
});

describe("host speaker prefetch", () => {
  it("loads the upcoming line unless muted", () => {
    const { output } = fakeOutput();
    const speaker = make(output);
    speaker.prefetch(host("h1"));
    expect(output.prefetch).toHaveBeenCalledTimes(1);
    speaker.setMuted(true);
    speaker.prefetch(host("h2"));
    expect(output.prefetch).toHaveBeenCalledTimes(1);
  });
});

/** Stands in for HTMLAudioElement: `play` starts it, `end()` finishes it. */
class FakeAudio {
  static all: FakeAudio[] = [];
  static blockAutoplay = false;
  onplaying: (() => void) | null = null;
  onended: (() => void) | null = null;
  onerror: (() => void) | null = null;
  paused = false;
  constructor(public src: string) {
    FakeAudio.all.push(this);
  }
  play() {
    if (FakeAudio.blockAutoplay) return Promise.reject(new Error("NotAllowedError"));
    this.onplaying?.();
    return Promise.resolve();
  }
  pause() {
    this.paused = true;
  }
  end() {
    this.onended?.();
  }
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));
const handlers = () => ({ onStart: vi.fn(), onEnd: vi.fn() });

describe("apiSpeechOutput", () => {
  beforeEach(() => {
    FakeAudio.all = [];
    FakeAudio.blockAutoplay = false;
    vi.stubGlobal("Audio", FakeAudio);
  });
  afterEach(() => vi.unstubAllGlobals());

  const setup = (fetchAudio = vi.fn(async (id: string) => new Blob([id]))) => {
    const { output: fallback, spoken } = fakeOutput();
    const output = apiSpeechOutput(fetchAudio, fallback)!;
    return { output, fallback, spoken, fetchAudio };
  };

  it("plays each line's audio from the API, one after another", async () => {
    const { output, fetchAudio, spoken } = setup();
    const first = handlers();
    output.speak(host("h1"), first);
    output.speak(host("h2"), handlers());
    await settle();

    expect(fetchAudio).toHaveBeenCalledWith("h1");
    expect(FakeAudio.all).toHaveLength(1);
    expect(first.onStart).toHaveBeenCalled();

    FakeAudio.all[0].end();
    await settle();
    expect(first.onEnd).toHaveBeenCalled();
    expect(FakeAudio.all).toHaveLength(2);
    expect(spoken).toEqual([]);
  });

  it("fetches a prefetched line only once", async () => {
    const { output, fetchAudio } = setup();
    output.prefetch!(host("h1"));
    output.speak(host("h1"), handlers());
    await settle();
    expect(fetchAudio).toHaveBeenCalledTimes(1);
    expect(FakeAudio.all).toHaveLength(1);
  });

  it("uses the browser's voice, for good, once the API says it has none", async () => {
    const fetchAudio = vi.fn(async (): Promise<Blob> => {
      throw new ApiError(503, "The host voice is off");
    });
    const { output, spoken } = setup(fetchAudio);
    output.speak(host("h1"), handlers());
    await settle();
    output.speak(host("h2"), handlers());
    await settle();

    expect(spoken).toEqual(["Ok. Now let's talk about h1.", "Ok. Now let's talk about h2."]);
    expect(fetchAudio).toHaveBeenCalledTimes(1);
  });

  it("uses the browser's voice for a line it isn't allowed to autoplay", async () => {
    FakeAudio.blockAutoplay = true;
    const { output, spoken } = setup();
    output.speak(host("h1"), handlers());
    await settle();
    expect(spoken).toEqual(["Ok. Now let's talk about h1."]);
  });

  it("stops the current line and drops the queued ones when cancelled", async () => {
    const { output, fallback } = setup();
    output.speak(host("h1"), handlers());
    output.speak(host("h2"), handlers());
    await settle();

    output.cancel();
    await settle();

    expect(FakeAudio.all).toHaveLength(1);
    expect(FakeAudio.all[0].paused).toBe(true);
    expect(fallback.cancel).toHaveBeenCalled();
  });
});
