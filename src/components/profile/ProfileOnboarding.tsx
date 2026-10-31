"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useUpsertProfile } from "@/lib/queries";
import { Wordmark } from "@/components/brand/Wordmark";

export function ProfileOnboarding() {
  const { user } = useAuth();
  const upsert = useUpsertProfile();
  const [displayName, setDisplayName] = useState(user?.displayName ?? "");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) return;
    upsert.mutate({ displayName: displayName.trim() });
  };

  return (
    <div className="relative grid min-h-screen place-items-center bg-cream px-6 py-10">
      <div aria-hidden className="bg-dots pointer-events-none absolute inset-0" />
      <form
        onSubmit={submit}
        className="relative w-full max-w-md rounded-3xl border-2 border-ink bg-white p-8 shadow-pop-lg"
      >
        <Wordmark />
        <h1 className="mt-6 font-display text-2xl font-extrabold tracking-tight text-ink">
          Set up your profile
        </h1>
        <p className="mt-2 text-sm text-on-surface-variant">
          This is how you&apos;ll appear in rooms.
        </p>

        <label className="mt-6 block text-sm font-semibold text-on-surface">Display name</label>
        <input
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="e.g. Lucas"
          className="mt-1.5 h-11 w-full rounded-xl border-2 border-ink/15 bg-white px-3 outline-none transition-colors focus:border-ink"
          maxLength={40}
          autoFocus
        />

        {upsert.isError && (
          <p className="mt-4 text-sm font-medium text-error">
            {upsert.error instanceof Error ? upsert.error.message : "Could not save profile"}
          </p>
        )}

        <button
          type="submit"
          disabled={upsert.isPending || !displayName.trim()}
          className="mt-7 flex h-12 w-full items-center justify-center gap-2 rounded-pill border-2 border-ink bg-ink font-display font-bold text-cream shadow-pop-sm transition-all hover:translate-x-px hover:translate-y-px hover:shadow-none disabled:opacity-50"
        >
          {upsert.isPending ? "Saving…" : "Continue"}
          <ArrowRight className="h-5 w-5" />
        </button>
      </form>
    </div>
  );
}
