"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useUpsertProfile } from "@/lib/queries";
import { Wordmark } from "@/components/brand/Wordmark";
import { cn } from "@/lib/cn";
import type { EnglishLevel } from "@/lib/types";

const LEVELS: { value: EnglishLevel; label: string; hint: string }[] = [
  { value: "beginner", label: "Beginner", hint: "A1" },
  { value: "elementary", label: "Elementary", hint: "A2" },
  { value: "intermediate", label: "Intermediate", hint: "B1" },
  { value: "upper-intermediate", label: "Upper-int.", hint: "B2" },
  { value: "advanced", label: "Advanced", hint: "C1–C2" },
];

export function ProfileOnboarding() {
  const { user } = useAuth();
  const upsert = useUpsertProfile();
  const [displayName, setDisplayName] = useState(user?.displayName ?? "");
  const [level, setLevel] = useState<EnglishLevel>("intermediate");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) return;
    upsert.mutate({ displayName: displayName.trim(), englishLevel: level });
  };

  return (
    <div className="grid min-h-screen place-items-center bg-white px-6">
      <form
        onSubmit={submit}
        className="w-full max-w-md rounded-3xl border border-outline-variant bg-white p-8 shadow-[0_24px_70px_-24px_rgba(0,30,64,0.35)]"
      >
        <Wordmark />
        <h1 className="mt-6 font-display text-2xl font-extrabold tracking-tight text-primary">
          Set up your profile
        </h1>
        <p className="mt-2 text-sm text-on-surface-variant">
          This is how you&apos;ll appear in rooms. You can change it later.
        </p>

        <label className="mt-6 block text-sm font-semibold text-on-surface">Display name</label>
        <input
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="e.g. Lucas"
          className="mt-1.5 h-11 w-full rounded-lg border border-outline-variant px-3 outline-none focus:border-primary"
          maxLength={40}
          autoFocus
        />

        <p className="mt-5 text-sm font-semibold text-on-surface">Your English level</p>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {LEVELS.map((l) => (
            <button
              type="button"
              key={l.value}
              onClick={() => setLevel(l.value)}
              className={cn(
                "rounded-xl border px-3 py-2 text-left transition-colors",
                level === l.value
                  ? "border-primary bg-primary-fixed/40"
                  : "border-outline-variant hover:border-primary/40",
              )}
            >
              <span className="block text-sm font-semibold text-on-surface">{l.label}</span>
              <span className="block text-xs text-on-surface-variant">{l.hint}</span>
            </button>
          ))}
        </div>

        {upsert.isError && (
          <p className="mt-4 text-sm font-medium text-error">
            {upsert.error instanceof Error ? upsert.error.message : "Could not save profile"}
          </p>
        )}

        <button
          type="submit"
          disabled={upsert.isPending || !displayName.trim()}
          className="mt-7 flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary font-semibold text-on-primary transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {upsert.isPending ? "Saving…" : "Continue"}
          <ArrowRight className="h-5 w-5" />
        </button>
      </form>
    </div>
  );
}
