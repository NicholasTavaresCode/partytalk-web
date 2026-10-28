"use client";

import { Lightbulb, Loader2, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/cn";
import type { SuggestionTrigger, TopicSuggestion } from "@/lib/types";

const TRIGGER: Record<SuggestionTrigger, { label: string; cls: string }> = {
  volume: { label: "After lots of talk", cls: "bg-primary-fixed text-on-primary-fixed" },
  silence: { label: "After a pause", cls: "bg-tertiary-fixed text-on-tertiary-fixed" },
  manual: { label: "Host's request", cls: "bg-secondary/15 text-secondary-fixed-dim" },
};

const clock = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

/**
 * The AI host's topic suggestions, in a side panel the user opens on demand
 * (✨ in the control bar) — it never covers the participants. New topics arrive
 * while it's closed as a dot on that button. Only the room's host can ask for a
 * topic on demand (`onSuggest`); everyone sees what it suggests.
 */
export function AiHostPanel({
  open,
  onClose,
  seedTopic,
  persona,
  live,
  suggestions,
  onSuggest,
  suggesting,
  suggestError,
}: {
  open: boolean;
  onClose: () => void;
  seedTopic: string;
  persona: string;
  live: boolean;
  /** Newest first. */
  suggestions: TopicSuggestion[];
  /** Host only — the API refuses everyone else, so leave it out for them. */
  onSuggest?: () => void;
  suggesting: boolean;
  suggestError?: string;
}) {
  if (!open) return null;
  const [latest, ...earlier] = suggestions;

  return (
    <aside
      aria-label="AI host"
      className="absolute inset-y-0 right-0 z-10 flex w-full max-w-sm flex-col border-l border-white/10 bg-[#28292c] text-white shadow-2xl lg:w-[22rem]"
    >
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <span className="flex items-center gap-2 text-sm font-bold">
          <Sparkles className="h-4 w-4 text-tertiary-fixed" /> AI host
        </span>
        <button
          onClick={onClose}
          aria-label="Close AI host"
          className="grid h-8 w-8 place-items-center rounded-lg text-white/60 hover:bg-white/10 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
        {/* Current topic */}
        <div className="rounded-2xl bg-gradient-to-br from-primary-container to-primary p-4 ring-1 ring-tertiary-fixed/20">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wide text-tertiary-fixed">
              {latest ? "Try this topic" : "Opening topic"}
            </span>
            {latest && (
              <span
                className={cn(
                  "rounded-pill px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                  TRIGGER[latest.trigger].cls,
                )}
              >
                {TRIGGER[latest.trigger].label}
              </span>
            )}
          </div>
          <p className="mt-2 font-display text-lg font-extrabold leading-snug">
            “{latest ? latest.topic : seedTopic}”
          </p>
          {latest ? (
            <>
              <p className="mt-1.5 text-sm leading-relaxed text-white/80">{latest.rationale}</p>
              <p className="mt-1 text-[11px] text-white/50">Suggested at {clock(latest.at)}</p>
            </>
          ) : (
            <p className="mt-1.5 text-sm leading-relaxed text-white/75">
              {live
                ? "Talk it through — new angles show up here as the conversation flows."
                : "New suggestions show up here once the host starts the session."}
            </p>
          )}
        </div>

        {live &&
          (onSuggest ? (
            <div>
              <button
                onClick={onSuggest}
                disabled={suggesting}
                className="inline-flex w-full items-center justify-center gap-2 rounded-pill bg-white/10 px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-white/20 disabled:opacity-60"
              >
                {suggesting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lightbulb className="h-4 w-4" />}
                {suggesting ? "Thinking…" : "Suggest a topic"}
              </button>
              <p className="mt-1.5 text-center text-[11px] text-white/45">
                {suggestError ?? "As the host, you can ask for a new topic anytime. Everyone sees it."}
              </p>
            </div>
          ) : (
            <p className="flex items-center gap-2 rounded-xl bg-black/20 px-3 py-2.5 text-xs text-white/60">
              <Lightbulb className="h-3.5 w-3.5 shrink-0" />
              The host can ask the AI for a new topic. It shows up here for everyone.
            </p>
          ))}

        {earlier.length > 0 && (
          <section>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-white/50">
              Earlier topics ({earlier.length})
            </p>
            <ul className="space-y-2">
              {earlier.map((s) => (
                <li key={s.id} className="rounded-xl bg-black/20 p-3">
                  <div className="flex items-center gap-2 text-[10px] text-white/50">
                    <span className="font-bold uppercase tracking-wide">{TRIGGER[s.trigger].label}</span>·{" "}
                    {clock(s.at)}
                  </div>
                  <p className="mt-1 text-sm font-semibold">“{s.topic}”</p>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      <p className="border-t border-white/10 px-4 py-3 text-[11px] italic text-white/40">{persona}</p>
    </aside>
  );
}
