"use client";

import Link from "next/link";
import { ArrowRight, Lock, Target } from "lucide-react";
import { useSideQuests } from "@/lib/queries";
import { splitQuests } from "@/lib/sideQuests";
import { MAX_OPEN_QUESTS } from "@/lib/types";
import { QuestCard } from "./QuestCard";

/** The learner's side quests: what to work on now, and what they've already got. */
export function SideQuestBoard() {
  const { data: quests, isLoading, isError, error } = useSideQuests();
  const { open, done } = splitQuests(quests ?? []);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="inline-flex items-center gap-2 rounded-pill border-2 border-ink bg-card px-3 py-1 font-label text-xs font-bold uppercase tracking-wider text-ink shadow-pop-sm">
          <Target className="h-3.5 w-3.5" aria-hidden /> {open.length} / {MAX_OPEN_QUESTS} open
        </span>
        <p className="flex items-center gap-1.5 text-xs text-on-surface-variant">
          <Lock className="h-3.5 w-3.5" aria-hidden /> Our AI host adds and checks off quests. They can&apos;t be
          removed by hand.
        </p>
      </div>

      {isError && (
        <p className="mt-6 rounded-2xl border border-error/30 bg-error-container/40 p-4 text-sm text-on-error-container">
          {error instanceof Error ? error.message : "Could not load your side quests."}
        </p>
      )}

      <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {isLoading &&
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-40 animate-pulse rounded-2xl border-2 border-ink/10 bg-surface-container-low" />
          ))}
        {open.map((q) => (
          <QuestCard key={q.id} quest={q} />
        ))}
      </div>

      {!isLoading && !isError && open.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-3xl border-2 border-dashed border-ink/30 bg-card px-6 py-14 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-full border-2 border-ink bg-lime shadow-pop-sm text-ink-fixed">
            <Target className="h-6 w-6 text-ink-fixed" />
          </span>
          <p className="font-display text-lg font-bold text-ink">
            {done.length ? "All caught up!" : "No side quests yet"}
          </p>
          <p className="max-w-md text-sm text-on-surface-variant">
            {done.length
              ? "You've completed every quest your host set. Talk in another room and it'll find your next ones."
              : "Speak up in a room. When it ends, our AI host picks a few habits for you to practise in any conversation."}
          </p>
          <Link
            href="/practice"
            className="mt-1 inline-flex h-10 items-center gap-1.5 rounded-pill border-2 border-ink bg-lime px-5 font-display text-sm font-bold text-ink-fixed shadow-pop-sm transition-all hover:translate-x-px hover:translate-y-px hover:shadow-none"
          >
            Find a room <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      )}

      {done.length > 0 && (
        <section className="mt-12">
          <h2 className="font-display text-xl font-extrabold tracking-tight text-ink">
            Completed <span className="text-on-surface-variant">({done.length})</span>
          </h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {done.map((q) => (
              <QuestCard key={q.id} quest={q} compact />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
