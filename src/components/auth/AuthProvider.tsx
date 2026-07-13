"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { onIdTokenChanged, type User as FirebaseUser } from "firebase/auth";
import { firebaseConfigured } from "@/lib/env";
import { getFirebaseAuth, signInWithGoogle, signOut } from "@/lib/firebase";

interface AuthState {
  user: FirebaseUser | null;
  loading: boolean;
  configured: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getFirebaseAuth();
    if (!auth) {
      setLoading(false);
      return;
    }
    return onIdTokenChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, loading, configured: firebaseConfigured, signIn: signInWithGoogle, signOut }}
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
