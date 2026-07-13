"use client";

import type { ReactNode } from "react";
import { useMe } from "@/lib/queries";
import { LoadingScreen } from "@/components/app/LoadingScreen";
import { ProfileOnboarding } from "./ProfileOnboarding";

/** Renders children once the signed-in user has a profile; otherwise onboards them. */
export function ProfileGate({ children }: { children: ReactNode }) {
  const { data, isLoading, isError, error } = useMe();

  if (isLoading) return <LoadingScreen label="Loading your profile…" />;

  if (isError) {
    return (
      <div className="grid min-h-screen place-items-center bg-surface px-6 text-center">
        <div>
          <p className="font-semibold text-on-surface">Couldn&apos;t reach the API</p>
          <p className="mt-1 text-sm text-on-surface-variant">
            {error instanceof Error ? error.message : "Please try again."}
          </p>
        </div>
      </div>
    );
  }

  if (data == null) return <ProfileOnboarding />;
  return <>{children}</>;
}
