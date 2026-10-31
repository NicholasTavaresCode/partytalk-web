"use client";

import { useEffect, useSyncExternalStore, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { LoadingScreen } from "@/components/app/LoadingScreen";
import { hadSessionHere } from "@/lib/sessionHint";

const noSubscription = () => () => {};

/**
 * The landing is for people who aren't signed in: a signed-in user is sent
 * straight to their rooms. Sign-in is restored in the browser after load, so a
 * returning user (see sessionHint) gets a spinner rather than a flash of the
 * pitch; a first-time visitor sees the landing at once (it's server-rendered).
 */
export function LandingGate({ children }: { children: ReactNode }) {
  const { user, loading, signingOut } = useAuth();
  const router = useRouter();
  // Server and hydration render say "no", so the markup matches; the real value follows.
  const returning = useSyncExternalStore(noSubscription, hadSessionHere, () => false);
  // Signing out lands here on purpose: don't bounce back while the session drops.
  const signedIn = !!user && !signingOut;

  useEffect(() => {
    if (signedIn) router.replace("/practice");
  }, [signedIn, router]);

  if (signedIn) return <LoadingScreen label="Taking you to your rooms…" />;
  if (loading && returning) return <LoadingScreen label="Signing you in…" />;
  return <>{children}</>;
}
