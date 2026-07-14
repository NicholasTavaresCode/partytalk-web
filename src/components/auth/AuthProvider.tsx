"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { env, googleConfigured } from "@/lib/env";
import {
  getDevUser,
  onAuthChange,
  promptSignIn,
  restoreSession,
  signOut,
  type AuthUser,
} from "@/lib/googleAuth";

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  configured: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  // Dev auth-bypass: skip GIS entirely and hand down a stand-in user.
  const [user, setUser] = useState<AuthUser | null>(env.authDisabled ? getDevUser() : null);
  // Only block on a session restore when Google sign-in is actually configured.
  const [loading, setLoading] = useState(googleConfigured && !env.authDisabled);

  useEffect(() => {
    if (env.authDisabled || !googleConfigured) return;
    const unsub = onAuthChange((u) => {
      setUser(u);
      setLoading(false);
    });
    // Silently restore a returning user; stop the spinner regardless of outcome.
    restoreSession()
      .catch(() => {})
      .finally(() => setLoading(false));
    return unsub;
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        configured: googleConfigured || env.authDisabled,
        signIn: promptSignIn,
        signOut,
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
