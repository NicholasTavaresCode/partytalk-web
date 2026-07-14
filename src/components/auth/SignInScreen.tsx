"use client";

import { useEffect, useRef, useState } from "react";
import { Sparkles, Users, MessageSquareText, AlertTriangle } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { renderSignInButton } from "@/lib/googleAuth";
import { Wordmark } from "@/components/brand/Wordmark";

export function SignInScreen() {
  const { configured } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const buttonRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!configured || !buttonRef.current) return;
    renderSignInButton(buttonRef.current).catch((e) =>
      setError(e instanceof Error ? e.message : "Could not load Google sign-in"),
    );
  }, [configured]);

  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden bg-white px-6">
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-60" />
      <div className="pointer-events-none absolute -left-24 -top-24 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-16 bottom-0 h-72 w-72 rounded-full bg-tertiary-fixed/40 blur-3xl" />

      <div className="relative w-full max-w-md rounded-3xl border border-outline-variant bg-white p-8 shadow-[0_24px_70px_-24px_rgba(0,30,64,0.35)]">
        <Wordmark />
        <h1 className="mt-6 font-display text-3xl font-extrabold leading-tight tracking-tight text-primary">
          Practise English out loud, together.
        </h1>
        <p className="mt-3 text-on-surface-variant">
          Join a live room and speak with other learners while an AI host listens and drops in fresh
          topics to keep the conversation moving.
        </p>

        <ul className="mt-6 space-y-2.5 text-sm text-on-surface-variant">
          <li className="flex items-center gap-2.5">
            <Users className="h-4 w-4 text-primary" /> Small live group rooms
          </li>
          <li className="flex items-center gap-2.5">
            <Sparkles className="h-4 w-4 text-primary" /> AI suggests new topics in real time
          </li>
          <li className="flex items-center gap-2.5">
            <MessageSquareText className="h-4 w-4 text-primary" /> A highlights & tips report at the end
          </li>
        </ul>

        {configured ? (
          <div ref={buttonRef} className="mt-7 flex min-h-[44px] justify-center" />
        ) : (
          <div className="mt-7 flex items-start gap-3 rounded-lg border border-tertiary-fixed-dim bg-tertiary-fixed/20 p-4 text-sm text-on-surface">
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
