"use client";

import { useEffect, useRef, useState } from "react";

/** Minimal shape of the Web Speech API we use (not in the TS DOM lib). */
interface SpeechRecognitionResultLike {
  0: { transcript: string };
  isFinal: boolean;
}
interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
}
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start(): void;
  stop(): void;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

/**
 * Browser speech-to-text (Chrome/Edge). Each finalized utterance is handed to
 * `onFinal` so the caller can post it as a transcript segment for the AI host.
 * Where the API is unavailable (e.g. Firefox), `supported` is false and the AI
 * host can't hear that participant — the frontend never does its own
 * transcription beyond this browser API.
 */
export function useSpeechRecognition(onFinal: (text: string) => void) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const listeningRef = useRef(false);
  const onFinalRef = useRef(onFinal);
  onFinalRef.current = onFinal;

  useEffect(() => {
    const w = window as unknown as {
      SpeechRecognition?: SpeechRecognitionCtor;
      webkitSpeechRecognition?: SpeechRecognitionCtor;
    };
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Ctor) return;

    setSupported(true);
    const rec = new Ctor();
    rec.lang = "en-US";
    rec.continuous = true;
    rec.interimResults = false;
    rec.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) {
          const text = r[0].transcript.trim();
          if (text) onFinalRef.current(text);
        }
      }
    };
    rec.onend = () => {
      if (listeningRef.current) {
        try {
          rec.start();
        } catch {
          /* already started */
        }
      }
    };
    recRef.current = rec;
    return () => {
      listeningRef.current = false;
      try {
        rec.stop();
      } catch {
        /* noop */
      }
    };
  }, []);

  const start = () => {
    if (!recRef.current) return;
    listeningRef.current = true;
    setListening(true);
    try {
      recRef.current.start();
    } catch {
      /* already started */
    }
  };

  const stop = () => {
    listeningRef.current = false;
    setListening(false);
    try {
      recRef.current?.stop();
    } catch {
      /* noop */
    }
  };

  return { supported, listening, start, stop };
}
