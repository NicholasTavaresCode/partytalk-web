"use client";

import Link from "next/link";
import { Lock, SearchX, UserX } from "lucide-react";
import { Logo } from "@/components/brand/Logo";

type Reason = "not-invited" | "removed" | "not-found";

const COPY: Record<Reason, { icon: typeof Lock; title: string; body: string }> = {
  "not-invited": {
    icon: Lock,
    title: "This room is invite-only",
    body: "You're not on the guest list. Ask the host to invite the Google account below, or to send you a fresh invite link.",
  },
  removed: {
    icon: UserX,
    title: "You were removed from this room",
    body: "The host revoked your invite, so you're no longer in the conversation.",
  },
  "not-found": {
    icon: SearchX,
    title: "Room not found",
    body: "This room doesn't exist (anymore). Check the link with whoever sent it.",
  },
};

/** Shown instead of the room when the signed-in user may not (or no longer) be in it. */
export function RoomAccessScreen({
  reason,
  email,
  detail,
}: {
  reason: Reason;
  email?: string;
  /** Extra context, e.g. why an invite link was refused. */
  detail?: string;
}) {
  const { icon: Icon, title, body } = COPY[reason];
  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <header className="flex h-14 items-center border-b border-outline-variant bg-white px-4">
        <Logo className="h-7 w-7" />
      </header>
      <div className="grid flex-1 place-items-center p-6">
        <div className="w-full max-w-md rounded-3xl border border-outline-variant bg-white p-8 text-center shadow-sm">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary-fixed/50">
            <Icon className="h-7 w-7 text-primary" />
          </span>
          <h1 className="mt-5 font-display text-2xl font-extrabold tracking-tight text-primary">{title}</h1>
          <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">{body}</p>
          {detail && <p className="mt-3 text-sm font-medium text-error">{detail}</p>}
          {reason === "not-invited" && email && (
            <p className="mt-4 rounded-lg bg-surface-container-low px-3 py-2 text-sm text-on-surface">
              Signed in as <span className="font-semibold">{email}</span>
            </p>
          )}
          <Link
            href="/practice"
            className="mt-6 inline-flex h-11 items-center rounded-lg bg-primary px-6 font-semibold text-on-primary hover:opacity-90"
          >
            Back to rooms
          </Link>
        </div>
      </div>
    </div>
  );
}
