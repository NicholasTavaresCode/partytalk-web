"use client";

import { useEffect, useRef, useState } from "react";
import type { HostMessage } from "./types";

/* ------------------------- Speech abstraction ---------------------------- */

/** The bit of `speechSynthesis` we use, so it can be faked in tests. */
export interface SpeechOutput {
  speak(text: string, handlers: { onStart: () => void; onEnd: () => void }): void;
  cancel(): void;
}

/** The fields of a `SpeechSynthesisVoice` that `pickHostVoice` ranks on. */
export type VoiceInfo = Pick<SpeechSynthesisVoice, "name" | "lang" | "localService" | "voiceURI">;

/** Neural/cloud voices: Edge's "(Natural)", Apple's "(Premium)"/"(Enhanced)", Android's network ones. */
const NATURAL = /natural|neural|premium|enhanced|online|network/i;
/** Voices that sound fine though their names don't say so (Chrome's Google voices, Apple's defaults). */
const DECENT = /^google|samantha|\bava\b|zoe|allison|susan|evan|nathan|serena|daniel|karen|moira|tessa/i;
/** Formant synthesizers (Linux's default) and Apple's novelty voices: the robotic ones. */
const ROBOTIC =
  /espeak|mbrola|festival|\bpico\b|\b(albert|bad news|bahh|bells|boing|bubbles|cellos|good news|jester|organ|superstar|trinoids|whisper|wobble|zarvox|fred|junior|kathy|ralph)\b/i;

const LANG_SCORE: [RegExp, number][] = [
  [/^en[-_]us$/i, 30],
  [/^en[-_]gb$/i, 25],
  [/^en([-_]|$)/i, 15],
];

/**
 * The most natural-sounding English voice this browser offers, or null.
 * Left to itself the browser takes its default voice, which on Linux is a
 * robotic eSpeak one even when Chrome has Google's own voices on the list.
 */
export function pickHostVoice<V extends VoiceInfo>(voices: readonly V[]): V | null {
  let best: V | null = null;
  let bestScore = -Infinity;
  for (const v of voices) {
    const lang = LANG_SCORE.find(([re]) => re.test(v.lang))?.[1];
    if (lang === undefined) continue;
    const label = `${v.name} ${v.voiceURI}`;
    const score =
      lang +
      (NATURAL.test(label) ? 40 : 0) +
      (DECENT.test(v.name) ? 20 : 0) +
      (v.localService ? 0 : 10) -
      (ROBOTIC.test(label) ? 100 : 0);
    if (score > bestScore) {
      best = v;
      bestScore = score;
    }
  }
  return best;
}

/** Wrap the browser's speechSynthesis, or null where it's unavailable (SSR, old browsers). */
export function browserSpeechOutput(): SpeechOutput | null {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;
  if (typeof SpeechSynthesisUtterance === "undefined") return null;
  const synth = window.speechSynthesis;
  // Chrome loads its voice list asynchronously, starting on the first call.
  synth.getVoices();
  return {
    speak(text, { onStart, onEnd }) {
      const u = new SpeechSynthesisUtterance(text);
      const voice = pickHostVoice(synth.getVoices());
      if (voice) u.voice = voice;
      u.lang = voice?.lang ?? "en-US";
      u.onstart = onStart;
      u.onend = onEnd;
      u.onerror = onEnd;
      synth.speak(u);
    },
    cancel() {
      synth.cancel();
    },
  };
}

/* ------------------------------ Speaker ---------------------------------- */

/**
 * Messages older than this at creation time are history (seeded from REST) and
 * are never read aloud. The window absorbs small clock skew and a line that
 * landed moments before the room opened.
 */
export const FRESH_WINDOW_MS = 15_000;

export interface HostSpeaker {
  /**
   * Feed the current host-message list. Speaks each message once, in order,
   * skipping anything already seen, anything older than the fresh window, and
   * everything while muted (muted messages are still marked seen, so unmuting
   * does not replay a backlog). Returns the messages it spoke.
   */
  onMessages(messages: HostMessage[]): HostMessage[];
  setMuted(muted: boolean): void;
  dispose(): void;
}

export function createHostSpeaker(opts: {
  output: SpeechOutput | null;
  muted?: boolean;
  now?: () => number;
  onSpeakingChange?: (speaking: boolean) => void;
}): HostSpeaker {
  const now = opts.now ?? Date.now;
  const since = now() - FRESH_WINDOW_MS;
  const seen = new Set<string>();
  let muted = opts.muted ?? false;
  let disposed = false;

  const isFresh = (m: HostMessage) => {
    const t = Date.parse(m.at);
    return Number.isNaN(t) ? true : t >= since;
  };

  return {
    onMessages(messages) {
      const spoken: HostMessage[] = [];
      for (const m of messages) {
        if (seen.has(m.id)) continue;
        seen.add(m.id);
        if (disposed || muted || !opts.output || !isFresh(m)) continue;
        opts.output.speak(m.message, {
          onStart: () => opts.onSpeakingChange?.(true),
          onEnd: () => opts.onSpeakingChange?.(false),
        });
        spoken.push(m);
      }
      return spoken;
    },
    setMuted(next) {
      muted = next;
      if (next) {
        opts.output?.cancel();
        opts.onSpeakingChange?.(false);
      }
    },
    dispose() {
      disposed = true;
      opts.output?.cancel();
      opts.onSpeakingChange?.(false);
    },
  };
}

/* -------------------------------- Hook ----------------------------------- */

/**
 * Read each new host line aloud with the browser's speechSynthesis — people in
 * the room are talking by voice, so the host has to be heard, not just read.
 */
export function useHostVoice(hostMessages: HostMessage[], muted: boolean) {
  const speakerRef = useRef<HostSpeaker | null>(null);
  const [supported, setSupported] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    const output = browserSpeechOutput();
    setSupported(output !== null);
    const speaker = createHostSpeaker({ output, onSpeakingChange: setSpeaking });
    speakerRef.current = speaker;
    return () => {
      speaker.dispose();
      speakerRef.current = null;
    };
  }, []);

  useEffect(() => {
    speakerRef.current?.setMuted(muted);
  }, [muted]);

  useEffect(() => {
    speakerRef.current?.onMessages(hostMessages);
  }, [hostMessages]);

  return { supported, speaking };
}
