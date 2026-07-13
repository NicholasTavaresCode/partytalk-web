"use client";

import { cn } from "@/lib/cn";

interface PaletteProps {
  total: number;
  current: number;
  answered?: number[];
  onSelect?: (n: number) => void;
}

/**
 * The IELTS question palette: a horizontally scrollable strip of numbered
 * buttons. Answered questions are underlined; the current one is highlighted in
 * gold with a navy border — exactly as in the computer-delivered exam.
 */
export function QuestionPalette({ total, current, answered = [], onSelect }: PaletteProps) {
  return (
    <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto py-2">
      {Array.from({ length: total }, (_, i) => i + 1).map((n) => {
        const active = n === current;
        const done = answered.includes(n);
        return (
          <button
            key={n}
            onClick={() => onSelect?.(n)}
            className={cn(
              "grid h-[34px] min-w-[34px] shrink-0 place-items-center rounded-sm text-question-num font-question-num transition-colors",
              active
                ? "border-2 border-primary bg-tertiary-fixed text-on-tertiary-fixed"
                : "border border-outline bg-surface-container-low text-on-surface-variant hover:bg-primary hover:text-on-primary",
              done && !active && "underline decoration-2 underline-offset-2",
            )}
            aria-current={active ? "true" : undefined}
          >
            {n}
          </button>
        );
      })}
    </div>
  );
}
