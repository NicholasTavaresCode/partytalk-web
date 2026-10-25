"use client";

import { useState } from "react";
import Link from "next/link";
import { LogOut, ChevronDown } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useMe } from "@/lib/queries";
import { IELTS_ENABLED } from "@/lib/features";
import { Wordmark } from "@/components/brand/Wordmark";
import { ParticipantAvatar } from "@/components/practice/ParticipantAvatar";
import { LevelBadge } from "@/components/practice/LevelBadge";

export function AppHeader() {
  const { user, signOut } = useAuth();
  const { data: me } = useMe();
  const [open, setOpen] = useState(false);
  const name = me?.displayName ?? user?.displayName ?? "You";

  return (
    <header className="sticky top-0 z-40 border-b border-outline-variant/70 bg-white/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-content items-center justify-between px-6 lg:px-8">
        <Link href="/practice" aria-label="PartyTalk" className="rounded-lg">
          <Wordmark />
        </Link>

        <div className="flex items-center gap-2">
          {IELTS_ENABLED && (
            <Link
              href="/ielts"
              className="hidden rounded-lg px-3.5 py-2 text-[15px] font-medium text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface sm:block"
            >
              IELTS Prep
            </Link>
          )}

          <div className="relative">
            <button
              onClick={() => setOpen((v) => !v)}
              className="flex items-center gap-2 rounded-pill border border-outline-variant py-1 pl-1 pr-2.5 transition-colors hover:bg-surface-container-low"
            >
              <ParticipantAvatar name={name} size={30} />
              <span className="hidden max-w-[120px] truncate text-sm font-semibold text-on-surface sm:block">
                {name}
              </span>
              <ChevronDown className="h-4 w-4 text-on-surface-variant" />
            </button>

            {open && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
                <div className="absolute right-0 z-20 mt-2 w-60 rounded-2xl border border-outline-variant bg-white p-2 shadow-[0_18px_44px_-24px_rgba(0,30,64,0.5)]">
                  <div className="flex items-center gap-3 px-2 py-2">
                    <ParticipantAvatar name={name} size={40} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-on-surface">{name}</p>
                      <p className="truncate text-xs text-on-surface-variant">{me?.email ?? user?.email}</p>
                    </div>
                  </div>
                  {me && (
                    <div className="px-2 pb-2">
                      <LevelBadge level={me.englishLevel} />
                    </div>
                  )}
                  <button
                    onClick={() => {
                      setOpen(false);
                      void signOut();
                    }}
                    className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium text-on-surface-variant transition-colors hover:bg-surface-container"
                  >
                    <LogOut className="h-4 w-4" /> Sign out
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
