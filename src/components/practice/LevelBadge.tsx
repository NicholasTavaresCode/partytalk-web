import { cn } from "@/lib/cn";
import type { EnglishLevel } from "@/lib/types";

const STYLES: Record<EnglishLevel, string> = {
  beginner: "bg-emerald-50 text-emerald-700 border-emerald-200",
  elementary: "bg-emerald-50 text-emerald-700 border-emerald-200",
  intermediate: "bg-sky-50 text-sky-700 border-sky-200",
  "upper-intermediate": "bg-sky-50 text-sky-700 border-sky-200",
  advanced: "bg-primary-fixed text-on-primary-fixed border-primary-fixed-dim",
};

const LABELS: Record<EnglishLevel, string> = {
  beginner: "Beginner",
  elementary: "Elementary",
  intermediate: "Intermediate",
  "upper-intermediate": "Upper-int.",
  advanced: "Advanced",
};

export function LevelBadge({ level, className }: { level: EnglishLevel; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-pill border px-2.5 py-0.5 text-xs font-bold",
        STYLES[level],
        className,
      )}
    >
      {LABELS[level]}
    </span>
  );
}
