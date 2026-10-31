"use client";

import type { ReactNode } from "react";
import { useAuth } from "./AuthProvider";
import { SignInScreen } from "./SignInScreen";
import { LoadingScreen } from "@/components/app/LoadingScreen";
import { ThemeScope } from "@/components/app/ThemeScope";

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading, signingOut } = useAuth();
  if (!user && signingOut) return <LoadingScreen label="Signing out…" />;
  if (!user && !loading) return <SignInScreen />;
  // Dark mode is for signed-in screens only (the sign-in screen above stays light).
  // The session restore's spinner follows it too, so a dark user doesn't see a light flash.
  return <ThemeScope>{loading ? <LoadingScreen /> : children}</ThemeScope>;
}
