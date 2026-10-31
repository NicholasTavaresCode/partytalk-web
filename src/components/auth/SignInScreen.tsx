"use client";

import { useEffect, useRef, useState } from "react";
import { Sparkles, Users, MessageSquareText, AlertTriangle } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { renderSignInButton } from "@/lib/googleAuth";
import { Wordmark } from "@/components/brand/Wordmark";

const POINTS = [
  { icon: Users, label: "Small live voice rooms", cls: "bg-lime text-ink" },
  { icon: Sparkles, label: "An AI host that changes the topic", cls: "bg-purple text-white" },
  { icon: MessageSquareText, label: "A highlights & tips report at the end", cls: "bg-coral text-ink" },
];

export function SignInScreen() {
  const { configured } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const buttonRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!configured || !buttonRef.current) return;
    renderSignInButton(buttonRef.current, { shape: "pill" }).catch((e) =>
      setError(e instanceof Error ? e.message : "Could not load Google sign-in"),
    );
  }, [configured]);

  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden bg-cream px-6 py-10">
      <div aria-hidden className="bg-dots pointer-events-none absolute inset-0" />

      <div className="relative w-full max-w-md rounded-3xl border-2 border-ink bg-white p-8 shadow-pop-lg">
        <span className="absolute -right-3 -top-4 rotate-3 rounded-pill border-2 border-ink bg-lime px-3 py-1 font-display text-xs font-bold text-ink shadow-pop-sm">
          Nothing to install ⚡
        </span>
        <Wordmark />
        <h1 className="mt-6 font-display text-3xl font-extrabold leading-tight tracking-tight text-ink">
          Practise English out loud, together.
        </h1>
        <p className="mt-3 text-on-surface-variant">
          Join a live room and speak with other learners while an AI host listens in and drops in
          fresh topics to keep the conversation moving.
        </p>

        <ul className="mt-6 space-y-2.5 text-sm font-semibold text-on-surface">
          {POINTS.map(({ icon: Icon, label, cls }) => (
            <li key={label} className="flex items-center gap-2.5">
              <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 border-ink ${cls}`}>
                <Icon className="h-3.5 w-3.5" />
              </span>
              {label}
            </li>
          ))}
        </ul>

        {configured ? (
          <div ref={buttonRef} className="mt-7 flex min-h-[44px] justify-center" />
        ) : (
          <div className="mt-7 flex items-start gap-3 rounded-2xl border-2 border-ink bg-lime/25 p-4 text-sm text-on-surface">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-tertiary" />
            <div>
              <p className="font-semibold">Google sign-in isn&apos;t configured yet</p>
              <p className="mt-1 text-on-surface-variant">
                Add your OAuth web client ID as{" "}
                <code className="rounded bg-surface-container px-1">NEXT_PUBLIC_GOOGLE_CLIENT_ID</code>{" "}
                in <code className="rounded bg-surface-container px-1">.env.local</code> and restart
                the dev server.
              </p>
            </div>
          </div>
        )}

        {error && <p className="mt-3 text-sm font-medium text-error">{error}</p>}
      </div>
    </div>
  );
}
