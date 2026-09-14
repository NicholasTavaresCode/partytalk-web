"use client";

import { useEffect, useState } from "react";
import { recentSpeakers, RECENT_SPEECH_MS } from "./roomHistory";

/** RMS level above which we call it speech, and how long "speaking" lingers after. */
const SPEAK_THRESHOLD = 0.05;
const HOLD_MS = 300;
/** Re-render cadence for the level (the bars animate between updates anyway). */
const LEVEL_TICK_MS = 80;

/**
 * Meter a MediaStream with an AnalyserNode. Returns a smoothed 0..1 level and a
 * debounced `speaking` flag. Pass null to stop metering (the stream is not
 * owned here, so it is never stopped).
 */
export function useAudioLevel(stream: MediaStream | null) {
  const [level, setLevel] = useState(0);
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    if (!stream || typeof window === "undefined" || typeof AudioContext === "undefined") {
      setLevel(0);
      setSpeaking(false);
      return;
    }
    const ctx = new AudioContext();
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    source.connect(analyser);
    const buf = new Uint8Array(analyser.fftSize);

    let raf = 0;
    let smooth = 0;
    let lastLoudAt = 0;
    let lastTickAt = 0;
    let wasSpeaking = false;

    const tick = (t: number) => {
      analyser.getByteTimeDomainData(buf);
      let sum = 0;
      for (let i = 0; i < buf.length; i++) {
        const v = (buf[i] - 128) / 128;
        sum += v * v;
      }
      const rms = Math.sqrt(sum / buf.length);
      smooth = smooth * 0.6 + rms * 0.4;
      const lvl = Math.min(1, smooth * 4);
      if (lvl > SPEAK_THRESHOLD) lastLoudAt = t;
      const nowSpeaking = t - lastLoudAt < HOLD_MS;
      if (nowSpeaking !== wasSpeaking) {
        wasSpeaking = nowSpeaking;
        setSpeaking(nowSpeaking);
      }
      if (t - lastTickAt > LEVEL_TICK_MS) {
        lastTickAt = t;
        setLevel(Math.round(lvl * 20) / 20);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    void ctx.resume().catch(() => {});

    return () => {
      cancelAnimationFrame(raf);
      source.disconnect();
      analyser.disconnect();
      void ctx.close().catch(() => {});
      setLevel(0);
      setSpeaking(false);
    };
  }, [stream]);

  return { level, speaking };
}

/**
 * Who has said something in the last few seconds, from the transcript feed —
 * the speaking signal for peers whose audio isn't flowing to us (P2P voice is
 * still waiting on backend signaling). Re-evaluates itself as lines expire.
 */
export function useRecentSpeakers(segments: { speakerId: string; at: string }[]): Set<string> {
  const [now, setNow] = useState(() => Date.now());
  const { speakers, nextExpiry } = recentSpeakers(segments, now, RECENT_SPEECH_MS);

  // A new line may arrive with `now` already stale; refresh once per change.
  useEffect(() => {
    setNow(Date.now());
  }, [segments]);

  useEffect(() => {
    if (nextExpiry === null) return;
    const id = setTimeout(() => setNow(Date.now()), Math.max(50, nextExpiry - Date.now()));
    return () => clearTimeout(id);
  }, [nextExpiry]);

  return speakers;
}
