"use client";

import Link from "next/link";
import { ArrowRight, Target } from "lucide-react";
import { useSideQuests } from "@/lib/queries";
import { roomQuestChanges, splitQuests } from "@/lib/sideQuests";
import { MAX_OPEN_QUESTS } from "@/lib/types";
import { QuestCard } from "./QuestCard";

/**
 * On the end-of-room report: what this room did to *your* side quests. The host
 * reviews everyone who spoke when the room ends, before `sessionEnded` goes out,
 * so the list is already up to date here. Private to the viewer.
 */
export function RoomQuestSummary({ roomId }: { roomId: string }) {
  const { data: quests, isLoading } = useSideQuests();
  if (isLoading || !quests) return null;

  const { added, completed } = roomQuestChanges(quests, roomId);
  const openCount = splitQuests(quests).open.length;

  return (
    <section className="mt-10 rounded-3xl border-2 border-ink bg-white p-6 shadow-pop">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-display text-lg font-bold text-ink">
          <Target className="h-5 w-5 text-purple" aria-hidden /> Your side quests
        </h2>
        <Link
          href="/quests"
          className="inline-flex items-center gap-1 font-display text-sm font-bold text-purple hover:underline"
        >
          All {openCount} / {MAX_OPEN_QUESTS} open <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {completed.length > 0 && (
        <>
          <p className="mt-4 font-label text-xs font-bold uppercase tracking-wider text-tertiary">
            Completed in this room 🎉
          </p>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            {completed.map((q) => (
              <QuestCard key={q.id} quest={q} compact />
            ))}
          </div>
        </>
      )}

      {added.length > 0 && (
        <>
          <p className="mt-4 font-label text-xs font-bold uppercase tracking-wider text-on-surface-variant">
            New for you
          </p>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            {added.map((q) => (
              <QuestCard key={q.id} quest={q} compact />
            ))}
          </div>
        </>
      )}

      {added.length === 0 && completed.length === 0 && (
        <p className="mt-3 text-sm text-on-surface-variant">
          No changes this time. Your host sets quests for people who spoke enough to go on, and checks them off when
          it hears you&apos;ve got them.
        </p>
      )}
    </section>
  );
}
