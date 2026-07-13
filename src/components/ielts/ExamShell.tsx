"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, CircleHelp, Clock, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { Logo } from "@/components/brand/Logo";

interface ExamShellProps {
  moduleLabel: string;
  durationSeconds: number;
  candidateName?: string;
  candidateId?: string;
  center?: ReactNode;
  onBack?: () => void;
  onNext?: () => void;
  backDisabled?: boolean;
  nextLabel?: string;
  children: ReactNode;
}

function format(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export function ExamShell({
  moduleLabel,
  durationSeconds,
  candidateName = "Jane Doe",
  candidateId = "123456",
  center,
  onBack,
  onNext,
  backDisabled,
  nextLabel = "Next",
  children,
}: ExamShellProps) {
  const [seconds, setSeconds] = useState(durationSeconds);

  useEffect(() => {
    const id = setInterval(() => setSeconds((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, []);

  const danger = seconds <= 300; // final 5 minutes

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background text-on-surface">
      {/* ------------------------------- Header -------------------------------- */}
      <header className="flex h-header-height shrink-0 items-center justify-between bg-primary px-gutter text-on-primary">
        <div className="flex items-center gap-3">
          <Logo onDark className="h-9 w-9" />
          <span className="font-headline-lg text-headline-lg">PartyTalk</span>
          <span className="mx-1 hidden h-6 w-px bg-white/25 sm:block" />
          <span className="hidden text-sm font-medium uppercase tracking-wide text-on-primary-container sm:block">
            {moduleLabel}
          </span>
        </div>

        <div className="flex flex-col items-center">
          <div
            className={cn(
              "flex items-center gap-2 rounded-lg border px-4 py-1 tabular-nums transition-colors",
              danger
                ? "border-on-error-container bg-error-container text-on-error-container"
                : "border-on-primary-container bg-primary-container text-on-primary",
            )}
          >
            <Clock className="h-5 w-5" />
            <span className="font-display-timer text-display-timer">{format(seconds)}</span>
          </div>
          <span className="mt-1 text-[10px] font-label-caps uppercase tracking-wider text-on-primary/70">
            Remaining time
          </span>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden text-right sm:block">
            <p className="font-headline-md text-headline-md leading-tight">{candidateName}</p>
            <p className="text-label-caps font-label-caps uppercase text-on-primary/70">
              Candidate ID: {candidateId}
            </p>
          </div>
          <button
            className="grid h-9 w-9 place-items-center rounded-lg text-on-primary/90 transition-colors hover:bg-primary-container"
            aria-label="Help"
            title="Help"
          >
            <CircleHelp className="h-5 w-5" />
          </button>
          <Link
            href="/ielts"
            className="grid h-9 w-9 place-items-center rounded-lg text-on-primary/90 transition-colors hover:bg-secondary"
            aria-label="Exit test"
            title="Exit test"
          >
            <X className="h-5 w-5" />
          </Link>
        </div>
      </header>

      {/* -------------------------------- Body --------------------------------- */}
      <main className="relative min-h-0 flex-1">{children}</main>

      {/* ------------------------------- Footer -------------------------------- */}
      <footer className="flex h-nav-footer-height shrink-0 items-center justify-between border-t border-outline-variant bg-surface-container-highest px-gutter">
        <button
          onClick={onBack}
          disabled={backDisabled}
          className="flex items-center gap-2 rounded-lg border border-outline px-5 py-2 font-headline-md text-headline-md text-on-surface-variant transition-colors hover:bg-primary hover:text-on-primary disabled:pointer-events-none disabled:opacity-30"
        >
          <ArrowLeft className="h-5 w-5" />
          <span className="hidden sm:inline">Back</span>
        </button>

        <div className="mx-4 flex min-w-0 flex-1 justify-center overflow-hidden">{center}</div>

        <button
          onClick={onNext}
          className="flex items-center gap-2 rounded-lg bg-primary px-6 py-2 font-headline-md text-headline-md text-on-primary transition-opacity hover:opacity-90"
        >
          <span className="hidden sm:inline">{nextLabel}</span>
          <ArrowRight className="h-5 w-5" />
        </button>
      </footer>
    </div>
  );
}
