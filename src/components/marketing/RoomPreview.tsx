"use client";

import { useEffect, useState } from "react";
import { Bot, Timer } from "lucide-react";
import { ParticipantAvatar } from "@/components/practice/ParticipantAvatar";
import { cn } from "@/lib/cn";

const PEOPLE = ["Lucas", "Mei", "Omar"];
/** Who talks on each tick — not round-robin, so it reads like a conversation. */
const SPEAKERS = [0, 2, 1, 2, 0, 1];

/** Lines the AI host says when it moves the room on — always somewhere unrelated. */
const PIVOTS = [
  { lead: "Ok. Now let's talk about", topic: "the Usain Bolt record", when: "After lots of talk" },
  { lead: "All right. Let's talk about", topic: "the movie Titanic", when: "After a pause" },
  { lead: "New topic! Should cities", topic: "ban cars from the centre?", when: "After lots of talk" },
];

const TICK_MS = 2400;
const TICKS_PER_TOPIC = 3;
/** The mock session's clock starts here and counts down a second per second. */
const START_SECONDS = 12 * 60 + 44;

/**
 * Decorative live room for the landing hero: the speaker moves around, the AI
 * host announces a new, unrelated topic every few seconds, and the clock runs.
 * Holds still for people who prefer reduced motion.
 */
export function RoomPreview({ className }: { className?: string }) {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const tick = Math.floor((seconds * 1000) / TICK_MS);
  const speaker = SPEAKERS[tick % SPEAKERS.length];
  const pivotIndex = Math.floor(tick / TICKS_PER_TOPIC) % PIVOTS.length;
  const pivot = PIVOTS[pivotIndex];
  const left = Math.max(0, START_SECONDS - seconds);
  const clock = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`;

  return (
    <div className={cn("relative", className)} aria-hidden>
      {/* Stickers */}
      <span className="absolute -right-2 -top-4 z-20 flex rotate-3 items-center gap-1.5 rounded-pill border-2 border-ink bg-coral px-3 py-1 font-display text-xs font-bold text-ink shadow-pop-sm motion-safe:animate-wiggle">
        Topic curveball 🔥
      </span>
      <span className="absolute -bottom-4 -left-3 z-20 flex -rotate-3 items-center gap-1.5 rounded-pill border-2 border-ink bg-lime px-3 py-1 font-display text-xs font-bold text-ink shadow-pop-sm">
        ⚡ Report when it ends
      </span>

      <div className="relative space-y-3.5 overflow-hidden rounded-3xl border-2 border-ink bg-white p-4 shadow-pop-lg lg:p-5 short:space-y-2.5 short:p-4">
        {/* Room title + clock */}
        <div className="flex items-center justify-between gap-3 border-b border-ink/10 pb-3 short:pb-2.5">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="relative flex h-3 w-3 shrink-0">
              <span className="absolute inset-0 rounded-full bg-lime motion-safe:animate-ping" />
              <span className="relative h-3 w-3 rounded-full border border-ink bg-lime" />
            </span>
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 font-display text-base font-bold leading-tight text-ink">
                <span className="truncate">Sunday coffee chat</span>
                <span className="rounded-pill bg-coral/15 px-2 py-px font-label text-[10px] font-bold uppercase tracking-wider text-secondary">
                  Live
                </span>
              </p>
              <p className="text-[11px] font-medium text-on-surface-variant">4 of 5 seats · 30-min session</p>
            </div>
          </div>
          <span className="flex shrink-0 items-center gap-1 rounded-pill border border-ink/10 bg-surface-container-low px-2.5 py-1 font-label text-xs font-bold tabular-nums text-on-surface-variant">
            <Timer className="h-3.5 w-3.5" /> {clock}
          </span>
        </div>

        {/* The host's latest line */}
        <div className="rounded-2xl border-2 border-ink bg-gradient-to-r from-amber-200 via-lime to-lime-light p-3 shadow-pop-sm">
          <div className="flex items-start gap-2.5">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-ink text-lime">
              <Bot className="h-4 w-4" />
            </span>
            <div key={pivotIndex} className="min-w-0 space-y-1 motion-safe:animate-topic-in">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-pill bg-white px-2 py-px font-label text-[10px] font-bold uppercase tracking-wider text-purple">
                  AI host · New topic
                </span>
                <span className="text-[10px] font-bold text-ink/70">{pivot.when}</span>
              </div>
              <p className="font-display text-sm font-bold leading-snug text-ink lg:text-[15px]">
                “{pivot.lead}{" "}
                <span className="rounded bg-white px-1 font-extrabold underline decoration-coral decoration-2 underline-offset-2">
                  {pivot.topic}
                </span>
                .”
              </p>
            </div>
          </div>
        </div>

        {/* Speakers + the AI host's own tile */}
        <div className="grid grid-cols-2 gap-2.5">
          {PEOPLE.map((name, i) => {
            const speaking = i === speaker;
            return (
              <div
                key={name}
                className={cn(
                  "flex items-center gap-2.5 rounded-xl p-2.5 transition-colors duration-300",
                  speaking ? "border-2 border-ink bg-lime/25" : "border-2 border-ink/10 bg-surface-container-low",
                )}
              >
                <ParticipantAvatar name={name} size={38} className="border-2 border-ink" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display text-xs font-bold text-ink">{name}</p>
                  {speaking ? (
                    <Equalizer />
                  ) : (
                    <span className="mt-0.5 inline-block rounded bg-surface-container-high px-1.5 py-px text-[10px] font-semibold text-on-surface-variant">
                      Listening
                    </span>
                  )}
                </div>
              </div>
            );
          })}
          <div className="flex items-center gap-2.5 rounded-xl border-2 border-ink bg-purple p-2.5 text-white">
            <span className="grid h-[38px] w-[38px] shrink-0 place-items-center rounded-full bg-lime font-display text-xs font-extrabold text-ink">
              AI
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-xs font-bold">AI host</p>
              <span className="text-[10px] font-bold text-lime">Listening in</span>
            </div>
          </div>
        </div>

        {/* What everyone gets when the room ends */}
        <div className="space-y-2 rounded-2xl border-2 border-ink bg-cream p-2.5 short:hidden sm:short:block">
          <div className="flex items-center justify-between">
            <span className="font-display text-xs font-bold text-ink">📊 Room report</span>
            <span className="rounded-pill border border-ink bg-lime px-2 py-0.5 font-label text-[10px] font-bold text-ink">
              For the whole group
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              { value: "4", label: "Topics explored", cls: "text-ink" },
              { value: "3", label: "Highlights", cls: "text-purple" },
              { value: "3", label: "Suggestions", cls: "text-secondary" },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border border-ink/10 bg-white p-1.5">
                <p className={cn("font-display text-sm font-extrabold", s.cls)}>{s.value}</p>
                <p className="text-[10px] font-semibold leading-tight text-on-surface-variant">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Equalizer() {
  return (
    <span className="mt-1 flex h-3 items-center gap-0.5">
      {["bg-purple", "bg-ink", "bg-purple", "bg-coral", "bg-ink"].map((color, i) => (
        <span
          key={i}
          className={cn("h-full w-1 origin-center rounded-full motion-safe:animate-eq", color)}
          style={{ animationDelay: `${i * 120}ms` }}
        />
      ))}
    </span>
  );
}
