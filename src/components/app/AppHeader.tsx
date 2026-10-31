"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, ChevronDown, Moon, Target } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useMe, useSideQuests } from "@/lib/queries";
import { cn } from "@/lib/cn";
import { setTheme, useTheme } from "@/lib/theme";
import { IELTS_ENABLED } from "@/lib/features";
import { Wordmark } from "@/components/brand/Wordmark";
import { ParticipantAvatar } from "@/components/practice/ParticipantAvatar";

export function AppHeader() {
  const { user, signOut } = useAuth();
  const { data: me } = useMe();
  const { data: quests } = useSideQuests();
  const openQuests = quests?.filter((q) => q.status === "open").length;
  const onQuests = usePathname() === "/quests";
  const dark = useTheme() === "dark";
  const [open, setOpen] = useState(false);
  const name = me?.displayName ?? user?.displayName ?? "You";

  return (
    <header className="sticky top-0 z-40 border-b border-ink/10 bg-cream/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-content items-center justify-between px-6 lg:px-8">
        <Link href="/practice" aria-label="PartyTalk" className="rounded-lg">
          <Wordmark />
        </Link>

        <div className="flex items-center gap-2">
          <Link
            href="/quests"
            aria-current={onQuests ? "page" : undefined}
            className={cn(
              "inline-flex h-10 items-center gap-1.5 rounded-pill border-2 px-3 font-display text-sm font-bold transition-colors",
              onQuests ? "border-ink bg-ink-fixed text-lime" : "border-ink/15 bg-card text-ink hover:border-ink",
            )}
          >
            <Target className="h-4 w-4" aria-hidden />
            <span className="hidden sm:inline">Side quests</span>
            {openQuests !== undefined && (
              <span
                className={cn(
                  "grid h-5 min-w-5 place-items-center rounded-pill px-1 font-label text-[11px]",
                  onQuests ? "bg-lime text-ink-fixed" : "bg-purple text-white",
                )}
              >
                {openQuests}
              </span>
            )}
          </Link>
          <div className="relative">
            <button
              onClick={() => setOpen((v) => !v)}
              className="flex items-center gap-2 rounded-pill border-2 border-ink bg-card py-1 pl-1 pr-2.5 shadow-pop-sm transition-all hover:translate-x-px hover:translate-y-px hover:shadow-none"
            >
              <ParticipantAvatar name={name} size={30} />
              <span className="hidden max-w-[120px] truncate font-display text-sm font-bold text-ink sm:block">
                {name}
              </span>
              <ChevronDown className="h-4 w-4 text-on-surface-variant" />
            </button>

            {open && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
                <div className="absolute right-0 z-20 mt-2 w-60 rounded-2xl border-2 border-ink bg-card p-2 shadow-pop">
                  <div className="flex items-center gap-3 px-2 py-2">
                    <ParticipantAvatar name={name} size={40} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-on-surface">{name}</p>
                      <p className="truncate text-xs text-on-surface-variant">{me?.email ?? user?.email}</p>
                    </div>
                  </div>
                  <button
                    role="switch"
                    aria-checked={dark}
                    onClick={() => setTheme(dark ? "light" : "dark")}
                    className="flex w-full items-center justify-between gap-2.5 rounded-lg px-2.5 py-2 text-sm font-semibold text-on-surface transition-colors hover:bg-surface-container"
                  >
                    <span className="flex items-center gap-2.5">
                      <Moon className="h-4 w-4" /> Dark mode
                    </span>
                    <span
                      aria-hidden
                      className={cn(
                        "relative h-5 w-9 rounded-pill border-2 border-ink transition-colors",
                        dark ? "bg-lime text-ink-fixed" : "bg-surface-container",
                      )}
                    >
                      <span
                        className={cn(
                          "absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-ink-fixed transition-all",
                          dark ? "left-[18px]" : "left-0.5",
                        )}
                      />
                    </span>
                  </button>
                  <button
                    onClick={() => {
                      setOpen(false);
                      void signOut();
                    }}
                    className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-semibold text-error transition-colors hover:bg-error-container/70"
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
