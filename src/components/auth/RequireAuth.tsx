"use client";

import type { ReactNode } from "react";
import { useAuth } from "./AuthProvider";
import { SignInScreen } from "./SignInScreen";
import { LoadingScreen } from "@/components/app/LoadingScreen";

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <SignInScreen />;
  return <>{children}</>;
}
