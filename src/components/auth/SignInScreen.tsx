"use client";

import { useState } from "react";
import { Sparkles, Users, MessageSquareText, AlertTriangle } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { Wordmark } from "@/components/brand/Wordmark";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
      <path fill="#4285F4" d="M23.06 12.25c0-.85-.08-1.67-.22-2.45H12v4.64h6.2a5.3 5.3 0 0 1-2.3 3.48v2.9h3.72c2.18-2 3.44-4.97 3.44-8.57z" />
      <path fill="#34A853" d="M12 24c3.12 0 5.73-1.03 7.64-2.8l-3.72-2.9c-1.03.7-2.35 1.1-3.92 1.1-3.02 0-5.57-2.04-6.49-4.78H1.66v3c1.9 3.78 5.8 6.38 10.34 6.38z" />
      <path fill="#FBBC05" d="M5.51 14.62A7.2 7.2 0 0 1 5.13 12c0-.91.16-1.79.38-2.62v-3H1.66A12 12 0 0 0 .38 12c0 1.94.46 3.77 1.28 5.62l3.85-3z" />
      <path fill="#EA4335" d="M12 4.75c1.7 0 3.23.58 4.43 1.73l3.3-3.3C17.73 1.15 15.12 0 12 0 7.46 0 3.56 2.6 1.66 6.38l3.85 3c.92-2.74 3.47-4.63 6.49-4.63z" />
    </svg>
  );
}

export function SignInScreen() {
  const { configured, signIn } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onSignIn = async () => {
    setError(null);
    setBusy(true);
    try {
      await signIn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sign-in failed");
    } finally {
      setBusy(false);
    }
  };

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
          <button
            onClick={onSignIn}
            disabled={busy}
            className="mt-7 flex h-12 w-full items-center justify-center gap-3 rounded-lg border border-outline bg-white font-semibold text-on-surface transition-colors hover:bg-surface-container-low disabled:opacity-60"
          >
            <GoogleIcon />
            {busy ? "Signing in…" : "Continue with Google"}
          </button>
        ) : (
          <div className="mt-7 flex items-start gap-3 rounded-lg border border-tertiary-fixed-dim bg-tertiary-fixed/20 p-4 text-sm text-on-surface">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-tertiary" />
            <div>
              <p className="font-semibold">Firebase isn&apos;t configured yet</p>
              <p className="mt-1 text-on-surface-variant">
                Add the <code className="rounded bg-surface-container px-1">partytalk-hml</code> web
                keys to <code className="rounded bg-surface-container px-1">.env.local</code> and
                restart the dev server.
              </p>
            </div>
          </div>
        )}

        {error && <p className="mt-3 text-sm font-medium text-error">{error}</p>}
      </div>
    </div>
  );
}
