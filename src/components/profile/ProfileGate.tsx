"use client";

import type { ReactNode } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { ApiError } from "@/lib/apiClient";
import { useMe } from "@/lib/queries";
import { LoadingScreen } from "@/components/app/LoadingScreen";
import { ProfileOnboarding } from "./ProfileOnboarding";

/** Renders children once the signed-in user has a profile; otherwise onboards them. */
export function ProfileGate({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth();
  const { data, isLoading, isError, error } = useMe();

  if (isLoading) return <LoadingScreen label="Loading your profile…" />;

  // The API refuses accounts outside its allow-list (ALLOWED_AUTH_EMAILS / _DOMAINS)
  // with 403 on every call — e.g. anyone who isn't a tester on a staging deploy.
  if (error instanceof ApiError && error.status === 403) {
    return (
      <div className="grid min-h-screen place-items-center bg-surface px-6 text-center">
        <div className="max-w-sm">
          <p className="font-semibold text-on-surface">This account can&apos;t use PartyTalk here</p>
          <p className="mt-1 text-sm text-on-surface-variant">
            Access is limited to invited testers. Ask the team to add{" "}
            <span className="font-semibold text-on-surface">{user?.email ?? "your Google account"}</span>, or
            sign in with another account.
          </p>
          <button
            onClick={() => void signOut()}
            className="mt-5 h-10 rounded-lg bg-primary px-5 text-sm font-semibold text-on-primary hover:opacity-90"
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

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
