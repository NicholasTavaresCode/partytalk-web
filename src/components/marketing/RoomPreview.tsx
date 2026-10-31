"use client";

import { useEffect, useState } from "react";
import { FileText, Mic, PhoneOff, Sparkles, UserPlus } from "lucide-react";
import { ParticipantAvatar } from "@/components/practice/ParticipantAvatar";
import { cn } from "@/lib/cn";

const PEOPLE = ["Lucas", "Mei", "Omar", "Sofia"];
/** Who talks on each tick — not round-robin, so it reads like a conversation. */
const SPEAKERS = [0, 2, 1, 3, 2, 0];

/** The kind of pivot the AI host suggests from what the room has been saying. */
const TOPICS = [
  {
    topic: "Would you rather live by the sea or in the mountains?",
    why: "You've all brought up weekend trips.",
  },
  {
    topic: "The best meal you've ever had while travelling",
    why: "Builds on Mei's story about Lisbon.",
  },
  {
    topic: "A skill you'd love to learn this year",
    why: "A fresh angle after all the work talk.",
  },
];

const TICK_MS = 2400;
const TICKS_PER_TOPIC = 3;

/**
 * Decorative live room for the landing hero, styled like the real one
 * (RoomExperience): the speaker moves around and the AI host's topic changes
 * every few seconds. Holds still for people who prefer reduced motion.
 */
export function RoomPreview({ className }: { className?: string }) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => setTick((t) => t + 1), TICK_MS);
    return () => clearInterval(id);
  }, []);

  const speaker = SPEAKERS[tick % SPEAKERS.length];
  const topicIndex = Math.floor(tick / TICKS_PER_TOPIC) % TOPICS.length;
  const { topic, why } = TOPICS[topicIndex];

  return (
    <div className={cn("relative", className)} aria-hidden>
      <div className="absolute -inset-8 rounded-[3rem] bg-primary-fixed-dim/15 blur-3xl" />

      <div className="relative rounded-[1.75rem] bg-[#202124] p-3 shadow-[0_40px_100px_-30px_rgba(0,0,0,0.8)] ring-1 ring-white/10">
        <div className="flex items-center justify-between px-2 pb-3 pt-1.5">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 rounded-pill bg-secondary-container px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
              <span className="h-1.5 w-1.5 rounded-full bg-white motion-safe:animate-pulse" /> Live
            </span>
            <span className="text-sm font-semibold text-white">Sunday coffee chat</span>
          </div>
          <span className="text-xs tabular-nums text-white/45">4 of 5 seats</span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {PEOPLE.map((name, i) => {
            const speaking = i === speaker;
            return (
              <div
                key={name}
                className={cn(
                  "relative grid aspect-[16/11] place-items-center rounded-2xl bg-[#3c4043] ring-2 transition-colors duration-500",
                  speaking ? "ring-emerald-400" : "ring-transparent",
                )}
              >
                <ParticipantAvatar name={name} size={60} />
                <span className="absolute bottom-2 left-2 flex items-center gap-1.5 rounded-lg bg-black/45 px-2 py-1 text-[11px] font-semibold text-white">
                  {speaking ? <Equalizer /> : <Mic className="h-3 w-3 text-white/70" />}
                  {name}
                </span>
              </div>
            );
          })}
        </div>

        <div className="mt-3 flex items-center justify-end gap-2.5 px-1 pb-1">
          <ControlDot>
            <Mic className="h-4 w-4" />
          </ControlDot>
          <ControlDot className="relative bg-white/20">
            <Sparkles className="h-4 w-4 text-tertiary-fixed" />
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-tertiary-fixed ring-2 ring-[#202124]" />
          </ControlDot>
          <ControlDot>
            <UserPlus className="h-4 w-4" />
          </ControlDot>
          <ControlDot className="w-14 bg-secondary-container">
            <PhoneOff className="h-4 w-4" />
          </ControlDot>
        </div>
      </div>

      {/* The AI host's latest topic, as in the room's ✨ panel. */}
      <div className="absolute -bottom-12 -left-12 w-[17.5rem] -rotate-2 short:-bottom-14 short:w-[15rem] rounded-2xl bg-gradient-to-br from-primary-container to-on-primary-fixed-variant p-4 text-white shadow-2xl ring-1 ring-tertiary-fixed/25 xl:-left-16">
        <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-tertiary-fixed">
          <Sparkles className="h-3.5 w-3.5" /> AI host · Try this topic
        </p>
        <div key={topicIndex} className="motion-safe:animate-topic-in">
          <p className="mt-2 font-display text-[15px] font-bold leading-snug">“{topic}”</p>
          <p className="mt-1.5 text-xs text-white/65 short:hidden">{why}</p>
        </div>
      </div>

      {/* What everyone gets when the host ends the room. */}
      <div className="absolute -top-11 right-2 flex rotate-2 items-center gap-2.5 rounded-2xl bg-white px-3.5 py-2.5 text-on-surface shadow-2xl xl:-right-6">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-tertiary-fixed text-on-tertiary-fixed">
          <FileText className="h-[18px] w-[18px]" />
        </span>
        <span>
          <span className="block text-xs font-bold">Room report</span>
          <span className="block text-[11px] text-on-surface-variant">Highlights · tips · topics</span>
        </span>
      </div>
    </div>
  );
}

function ControlDot({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <span className={cn("grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white", className)}>
      {children}
    </span>
  );
}

function Equalizer() {
  return (
    <span className="flex h-3 items-end gap-[2px]">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-full w-[3px] origin-bottom rounded-full bg-emerald-400 motion-safe:animate-eq"
          style={{ animationDelay: `${i * 150}ms` }}
        />
      ))}
    </span>
  );
}
