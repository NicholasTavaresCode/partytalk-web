"use client";

import { useRouter } from "next/navigation";
import { ArrowRight, Check, Loader2, Mail, Sparkles } from "lucide-react";
import { ApiError } from "@/lib/apiClient";
import { useAcceptInvite } from "@/lib/queries";
import { isFull } from "@/lib/roomList";
import type { Room } from "@/lib/types";
import { RoomMeta, RoomStatusChip } from "./RoomCard";

/** Why an accept failed, in words; the list refetches either way. */
function acceptError(error: unknown): string {
  if (error instanceof ApiError && error.status === 409) return "This room just filled up or ended.";
  if (error instanceof ApiError && error.status === 403) return "This invitation was withdrawn.";
  return error instanceof Error ? error.message : "Couldn't accept. Try again.";
}

/**
 * An invitation you haven't accepted: the in-app twin of the invite email.
 * Accepting takes a seat (rooms cap at 5). A live room takes you straight in;
 * a waiting one moves to Your rooms until the host starts it.
 */
export function InviteCard({ room }: { room: Room }) {
  const router = useRouter();
  const accept = useAcceptInvite();
  const full = isFull(room);
  const live = room.status === "live";

  const onAccept = () =>
    accept.mutate(room.id, {
      onSuccess: () => {
        if (live) router.push(`/practice/${room.id}`);
      },
    });

  return (
    <article className="flex flex-col rounded-3xl border-2 border-ink bg-white p-6 shadow-pop">
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-pill border-2 border-ink bg-purple px-2.5 py-0.5 font-label text-[11px] font-bold uppercase tracking-wider text-white">
          <Mail className="h-3 w-3" aria-hidden /> Invitation
        </span>
        <RoomMeta room={room} />
      </div>

      <p className="mt-3 text-sm text-on-surface-variant">
        <span className="font-bold text-ink">{room.ownerName ?? "The host"}</span> invited you to talk about
      </p>
      <h3 className="mt-1 line-clamp-2 font-display text-lg font-bold text-ink">{room.topic}</h3>
      <span className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium text-on-surface-variant">
        <RoomStatusChip status={room.status} />
        {room.topicPickedByHost && (
          <span className="inline-flex items-center gap-1">
            <Sparkles className="h-3.5 w-3.5 text-purple" /> picked by the host
          </span>
        )}
      </span>

      <div aria-hidden className="min-h-5 flex-1" />
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ink/10 pt-4">
        <span className="text-xs text-on-surface-variant">
          {accept.isError
            ? <span className="font-medium text-error">{acceptError(accept.error)}</span>
            : full
              ? "Every seat is taken."
              : live
                ? "They're talking now."
                : "Accepting saves your seat."}
        </span>
        <button
          onClick={onAccept}
          disabled={full || accept.isPending}
          className="inline-flex h-10 items-center gap-1.5 rounded-pill border-2 border-ink bg-lime px-4 font-display text-sm font-bold text-ink shadow-pop-sm transition-all hover:translate-x-px hover:translate-y-px hover:bg-lime-light hover:shadow-none disabled:pointer-events-none disabled:opacity-50"
        >
          {accept.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : live ? (
            <ArrowRight className="h-4 w-4" />
          ) : (
            <Check className="h-4 w-4" />
          )}
          {full ? "Full" : live ? "Accept & join" : "Accept"}
        </button>
      </div>
    </article>
  );
}
