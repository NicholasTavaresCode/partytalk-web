import { BookOpen, CheckCircle2, MessagesSquare, PenLine, Waves } from "lucide-react";
import { SKILL_LABEL } from "@/lib/sideQuests";
import { cn } from "@/lib/cn";
import type { QuestSkill, SideQuest } from "@/lib/types";

const SKILL_STYLE: Record<QuestSkill, { icon: typeof PenLine; cls: string }> = {
  grammar: { icon: PenLine, cls: "border-purple/30 bg-purple-light text-purple" },
  vocabulary: { icon: BookOpen, cls: "border-lime-dim bg-lime/25 text-on-tertiary-fixed-variant" },
  fluency: { icon: Waves, cls: "border-secondary/40 bg-coral/15 text-secondary" },
  interaction: { icon: MessagesSquare, cls: "border-ink/15 bg-surface-container text-ink" },
};

const day = (iso: string) =>
  new Date(iso).toLocaleDateString([], { day: "numeric", month: "short" });

export function SkillChip({ skill }: { skill: QuestSkill }) {
  const { icon: Icon, cls } = SKILL_STYLE[skill];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-pill border px-2 py-0.5 font-label text-[11px] font-bold uppercase tracking-wider",
        cls,
      )}
    >
      <Icon className="h-3 w-3" aria-hidden />
      {SKILL_LABEL[skill]}
    </span>
  );
}

/**
 * One side quest. Open quests are cards to work on; completed ones show what the
 * host noticed. There are no actions: the host owns the list.
 */
export function QuestCard({ quest, compact = false }: { quest: SideQuest; compact?: boolean }) {
  const done = quest.status === "done";
  return (
    <article
      className={cn(
        "flex flex-col gap-2 rounded-2xl border-2 bg-white p-4",
        done ? "border-ink/15" : "border-ink shadow-pop-sm",
        compact && "p-3.5",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <SkillChip skill={quest.skill} />
        {done ? (
          <span className="inline-flex items-center gap-1 text-xs font-bold text-tertiary">
            <CheckCircle2 className="h-4 w-4" aria-hidden /> Done {quest.doneAt && day(quest.doneAt)}
          </span>
        ) : (
          <span className="text-xs text-on-surface-variant">Added {day(quest.createdAt)}</span>
        )}
      </div>
      <h3 className={cn("font-display font-bold leading-snug text-ink", compact ? "text-[15px]" : "text-base")}>
        {quest.title}
      </h3>
      <p className="text-sm leading-relaxed text-on-surface-variant">
        {done && quest.doneNote ? quest.doneNote : quest.detail}
      </p>
    </article>
  );
}
