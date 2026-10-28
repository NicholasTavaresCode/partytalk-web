"use client";

import { useState } from "react";
import { Check, Copy, Link2, Loader2, RefreshCw, UserPlus, X } from "lucide-react";
import { useRoomInvites } from "@/lib/queries";
import { inviteLink, parseEmails } from "@/lib/invites";
import type { Room } from "@/lib/types";

/**
 * Owner-only "who can join" panel: the invite list (add / revoke — revoking
 * kicks that person out immediately) and the shareable invite link (create,
 * copy, rotate, turn off). The API returns `invitedEmails` / `inviteCode` to the
 * owner only, so this panel is the single place they're shown.
 */
export function InvitePanel({ room, onClose }: { room: Room; onClose: () => void }) {
  const invites = useRoomInvites(room.id);
  const [draft, setDraft] = useState("");
  const [copied, setCopied] = useState(false);
  const parsed = parseEmails(draft);
  const emails = room.invitedEmails ?? [];
  const error = [invites.add, invites.revoke, invites.createLink, invites.disableLink].find((m) => m.isError)?.error;

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    if (!parsed.emails.length || parsed.invalid.length) return;
    invites.add.mutate(parsed.emails, { onSuccess: () => setDraft("") });
  };

  const copy = async (code: string) => {
    await navigator.clipboard.writeText(inviteLink(room.id, code));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <aside className="absolute right-3 top-2 z-20 flex max-h-[calc(100%-1rem)] w-[calc(100%-1.5rem)] max-w-sm flex-col rounded-2xl border border-outline-variant bg-white text-on-surface shadow-2xl">
      <div className="flex items-center justify-between border-b border-outline-variant px-4 py-3">
        <span className="flex items-center gap-2 text-sm font-bold">
          <UserPlus className="h-4 w-4 text-primary" /> Who can join
        </span>
        <button
          onClick={onClose}
          aria-label="Close invites"
          className="grid h-8 w-8 place-items-center rounded-lg text-on-surface-variant hover:bg-surface-container"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="exam-scroll min-h-0 flex-1 space-y-5 overflow-y-auto p-4">
        {/* Invite link */}
        <section>
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-on-surface-variant">
            <Link2 className="h-3.5 w-3.5" /> Invite link
          </p>
          {room.inviteCode ? (
            <>
              <div className="mt-2 flex items-center gap-2">
                <input
                  readOnly
                  value={inviteLink(room.id, room.inviteCode)}
                  onFocus={(e) => e.currentTarget.select()}
                  className="h-9 min-w-0 flex-1 rounded-lg border border-outline-variant bg-surface-container-low px-2.5 text-xs"
                />
                <button
                  onClick={() => copy(room.inviteCode!)}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-semibold text-on-primary hover:opacity-90"
                >
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
              <p className="mt-1.5 text-xs text-on-surface-variant">
                Anyone signed in who opens it joins and is added to the list below.
              </p>
              <div className="mt-2 flex gap-3 text-xs font-semibold">
                <button
                  onClick={() => invites.createLink.mutate()}
                  disabled={invites.createLink.isPending}
                  className="inline-flex items-center gap-1 text-primary hover:underline disabled:opacity-50"
                >
                  <RefreshCw className="h-3 w-3" /> New link
                </button>
                <button
                  onClick={() => invites.disableLink.mutate()}
                  disabled={invites.disableLink.isPending}
                  className="text-error hover:underline disabled:opacity-50"
                >
                  Turn off
                </button>
              </div>
              <p className="mt-1 text-[11px] text-on-surface-variant">
                A new link (or turning it off) stops the old one from admitting anyone else.
              </p>
            </>
          ) : (
            <button
              onClick={() => invites.createLink.mutate()}
              disabled={invites.createLink.isPending}
              className="mt-2 inline-flex h-9 items-center gap-1.5 rounded-lg border border-outline-variant px-3 text-sm font-semibold text-primary hover:bg-surface-container-low disabled:opacity-50"
            >
              {invites.createLink.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Link2 className="h-4 w-4" />
              )}
              Create invite link
            </button>
          )}
        </section>

        {/* Invite list */}
        <section>
          <p className="text-xs font-bold uppercase tracking-wide text-on-surface-variant">
            Invited ({emails.length})
          </p>
          <form onSubmit={add} className="mt-2 flex items-center gap-2">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="name@example.com"
              aria-label="Emails to invite"
              className="h-9 min-w-0 flex-1 rounded-lg border border-outline-variant px-2.5 text-sm outline-none focus:border-primary"
            />
            <button
              type="submit"
              disabled={!parsed.emails.length || parsed.invalid.length > 0 || invites.add.isPending}
              className="h-9 rounded-lg bg-primary px-3 text-sm font-semibold text-on-primary hover:opacity-90 disabled:opacity-40"
            >
              Invite
            </button>
          </form>
          {parsed.invalid.length > 0 && (
            <p className="mt-1 text-xs font-medium text-error">Not an email: {parsed.invalid.join(", ")}</p>
          )}

          {emails.length === 0 ? (
            <p className="mt-3 text-sm text-on-surface-variant">
              Nobody yet — only you can open this room. People you invite get an email with the link.
            </p>
          ) : (
            <ul className="mt-3 space-y-1.5">
              {emails.map((email) => (
                <li
                  key={email}
                  className="flex items-center justify-between gap-2 rounded-lg bg-surface-container-low px-3 py-2 text-sm"
                >
                  <span className="truncate">{email}</span>
                  <button
                    onClick={() => invites.revoke.mutate(email)}
                    disabled={invites.revoke.isPending}
                    title="Revoke — removes them from the room right away"
                    aria-label={`Revoke ${email}`}
                    className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-on-surface-variant hover:bg-surface-container hover:text-error disabled:opacity-50"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {error && (
          <p className="text-sm font-medium text-error">
            {error instanceof Error ? error.message : "Something went wrong"}
          </p>
        )}
      </div>
    </aside>
  );
}
