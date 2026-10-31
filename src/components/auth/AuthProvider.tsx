"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { env, googleConfigured } from "@/lib/env";
import {
  getDevUser,
  onAuthChange,
  promptSignIn,
  restoreSession,
  signOut as gisSignOut,
  type AuthUser,
} from "@/lib/googleAuth";

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  configured: boolean;
  signIn: () => Promise<void>;
  /** Signs out and goes to the landing page. */
  signOut: () => Promise<void>;
  /** True from a sign-out until the next sign-in; RequireAuth shows a spinner, not the sign-in screen. */
  signingOut: boolean;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  // Dev auth-bypass: skip GIS entirely and hand down a stand-in user.
  const [user, setUser] = useState<AuthUser | null>(env.authDisabled ? getDevUser() : null);
  // Only block on a session restore when Google sign-in is actually configured.
  const [loading, setLoading] = useState(googleConfigured && !env.authDisabled);
  const [signingOut, setSigningOut] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (env.authDisabled || !googleConfigured) return;
    const unsub = onAuthChange((u) => {
      setUser(u);
      setLoading(false);
      if (u) setSigningOut(false);
    });
    // Silently restore a returning user; stop the spinner regardless of outcome.
    restoreSession()
      .catch(() => {})
      .finally(() => setLoading(false));
    return unsub;
  }, []);

  // Head for the landing page before the session drops, so a gated page doesn't
  // flash its sign-in screen on the way out. A session that *expires* (401)
  // doesn't come through here: it stays put and shows the sign-in screen.
  const signOut = useCallback(async () => {
    setSigningOut(true);
    router.replace("/");
    await gisSignOut();
  }, [router]);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        configured: googleConfigured || env.authDisabled,
        signIn: promptSignIn,
        signOut,
        signingOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
