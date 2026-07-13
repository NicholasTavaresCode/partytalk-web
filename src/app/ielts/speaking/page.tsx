"use client";

import { useEffect, useState } from "react";
import { Mic, MicOff } from "lucide-react";
import { useSpeakingTest } from "@/lib/queries";
import { ExamShell } from "@/components/ielts/ExamShell";
import { ExaminerAvatar } from "@/components/ielts/ExaminerAvatar";
import { cn } from "@/lib/cn";

const BARS = 40;

export default function SpeakingSimulatorPage() {
  const { data } = useSpeakingTest();
  const [activePart, setActivePart] = useState(1);
  const [recording, setRecording] = useState(true);
  // Deterministic starting waveform (matches SSR — avoids hydration mismatch),
  // replaced by live random heights once recording animates on the client.
  const [heights, setHeights] = useState<number[]>(() =>
    Array.from({ length: BARS }, (_, i) => 18 + Math.round(46 * Math.abs(Math.sin(i * 0.6)))),
  );

  useEffect(() => {
    if (!recording) {
      setHeights(Array(BARS).fill(12));
      return;
    }
    const id = setInterval(() => {
      setHeights(Array.from({ length: BARS }, () => Math.random() * 78 + 12));
    }, 150);
    return () => clearInterval(id);
  }, [recording]);

  if (!data) return null;
  const part = data.parts[activePart - 1];

  const palette = (
    <div className="flex gap-1">
      {data.parts.map((p, i) => (
        <button
          key={p.id}
          onClick={() => setActivePart(i + 1)}
          className={cn(
            "flex h-10 w-8 items-center justify-center border font-question-num text-question-num transition-all",
            activePart === i + 1
              ? "border-2 border-primary bg-tertiary-fixed text-on-tertiary-fixed"
              : "border border-outline bg-surface-container-low text-on-surface-variant opacity-60 hover:opacity-100",
          )}
        >
          {p.id}
        </button>
      ))}
    </div>
  );

  return (
    <ExamShell
      moduleLabel="IELTS Speaking"
      durationSeconds={840}
      center={palette}
      onBack={() => setActivePart((p) => Math.max(1, p - 1))}
      onNext={() => setActivePart((p) => Math.min(data.parts.length, p + 1))}
      backDisabled={activePart === 1}
    >
      <div className="grid h-full place-items-center overflow-y-auto bg-surface p-gutter">
        <div className="grid w-full max-w-5xl items-center gap-10 lg:grid-cols-2">
          {/* Examiner */}
          <div className="flex flex-col items-center gap-6">
            <div className="relative">
              <div className="absolute -inset-1 animate-pulse-ring rounded-2xl bg-primary/20" />
              <div className="relative h-56 w-56 overflow-hidden rounded-2xl border-4 border-outline-variant bg-surface-container shadow-sm">
                <ExaminerAvatar className="h-full w-full" />
              </div>
            </div>
            <div className="text-center">
              <h2 className="font-headline-lg text-headline-lg text-primary">{data.examiner}</h2>
              <p className="font-body-md text-body-md text-on-surface-variant">
                Speaking Module Simulation
              </p>
            </div>
          </div>

          {/* Prompt & interaction */}
          <div className="flex flex-col gap-8 rounded-xl border border-outline-variant bg-surface-container-lowest p-8 lg:p-10">
            <div className="space-y-2">
              <span className="text-label-caps font-label-caps uppercase text-secondary">
                {part.label}
              </span>
              {part.cueCard ? (
                <div>
                  <h1 className="font-headline-lg text-headline-lg leading-tight text-on-surface">
                    {part.cueCard.task}
                  </h1>
                  <p className="mt-3 text-sm font-semibold text-on-surface">You should say:</p>
                  <ul className="mt-1 list-disc space-y-1 pl-5 text-on-surface-variant">
                    {part.cueCard.bullets.map((b) => (
                      <li key={b}>{b}</li>
                    ))}
                  </ul>
                </div>
              ) : (
                <h1 className="font-headline-lg text-headline-lg leading-tight text-on-surface">
                  “{part.current.text}”
                </h1>
              )}
            </div>

            {/* Waveform */}
            <div className="flex h-24 w-full items-end justify-center gap-1 overflow-hidden">
              {heights.map((h, i) => (
                <div
                  key={i}
                  className={cn(
                    "w-1 rounded-full transition-[height] duration-100",
                    h > 60 ? "bg-secondary" : "bg-primary-container/30",
                  )}
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>

            {/* Record control */}
            <div className="flex flex-col items-center gap-4">
              <button
                onClick={() => setRecording((r) => !r)}
                aria-label={recording ? "Pause recording" : "Resume recording"}
                className={cn(
                  "grid h-20 w-20 place-items-center rounded-2xl border-4 border-white shadow-lg transition-all active:scale-95",
                  recording ? "bg-secondary hover:bg-secondary-container" : "bg-outline hover:bg-on-surface-variant",
                )}
              >
                {recording ? (
                  <Mic className="h-8 w-8 text-on-secondary" />
                ) : (
                  <MicOff className="h-8 w-8 text-white" />
                )}
              </button>
              <span
                className={cn(
                  "text-label-caps font-label-caps uppercase",
                  recording ? "animate-pulse text-secondary" : "text-on-surface-variant",
                )}
              >
                {recording ? "Recording in progress" : "Recording paused"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </ExamShell>
  );
}
