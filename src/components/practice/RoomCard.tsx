import Link from "next/link";
import { ArrowRight, Sparkles, Timer, Users } from "lucide-react";
import type { Room } from "@/lib/types";
import { cn } from "@/lib/cn";

const STATUS: Record<Room["status"], { label: string; cls: string; dot: string; live?: boolean }> = {
  waiting: { label: "Waiting", cls: "bg-purple-light text-purple border-purple/30", dot: "bg-purple" },
  live: { label: "Live", cls: "bg-secondary/10 text-secondary border-secondary/20", dot: "bg-secondary", live: true },
  ended: {
    label: "Ended",
    cls: "bg-surface-container text-on-surface-variant border-outline-variant",
    dot: "bg-on-surface-variant",
  },
};

export function RoomStatusChip({ status }: { status: Room["status"] }) {
  const s = STATUS[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-pill border px-2.5 py-0.5 font-label text-[11px] font-bold uppercase tracking-wider",
        s.cls,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", s.dot, s.live && "animate-pulse")} />
      {s.label}
    </span>
  );
}

/** Session length and seats taken. */
export function RoomMeta({ room }: { room: Room }) {
  return (
    <span className="inline-flex items-center gap-3 text-xs font-medium text-on-surface-variant">
      {room.durationMinutes != null && (
        <span className="inline-flex items-center gap-1">
          <Timer className="h-3.5 w-3.5" />
          {room.durationMinutes} min
        </span>
      )}
      <span className="inline-flex items-center gap-1" title={`${room.participantIds.length} of ${room.maxParticipants} seats taken`}>
        <Users className="h-3.5 w-3.5" />
        {room.participantIds.length}/{room.maxParticipants}
      </span>
    </span>
  );
}

const day = (iso: string) => new Date(iso).toLocaleDateString([], { day: "numeric", month: "short" });

/** A room you own or have a seat in, or one that has ended. Invitations you haven't accepted use InviteCard. */
export function RoomCard({ room, uid }: { room: Room; uid?: string }) {
  const isOwner = room.ownerId === uid;
  const footer =
    room.status === "live"
      ? "In session"
      : room.status === "ended"
        ? `Ended${room.endedAt ? ` ${day(room.endedAt)}` : ""} · ${room.report ? "report ready" : "no report"}`
        : isOwner
          ? "Start it when everyone's here"
          : "Seat saved · waiting for the host";
  return (
    <Link
      href={`/practice/${room.id}`}
      className="group flex flex-col rounded-3xl border-2 border-ink bg-white p-6 shadow-pop transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-pop-lg"
    >
      <div className="flex items-center justify-between">
        <RoomStatusChip status={room.status} />
        <RoomMeta room={room} />
      </div>

      <h3 className="mt-3 line-clamp-2 font-display text-lg font-bold text-ink">{room.topic}</h3>
      <span className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium text-on-surface-variant">
        {!isOwner && room.ownerName && <span>Hosted by {room.ownerName}</span>}
        {room.topicPickedByHost && (
          <span className="inline-flex items-center gap-1">
            <Sparkles className="h-3.5 w-3.5 text-purple" /> picked by the host
          </span>
        )}
      </span>

      {/* Footers line up across a row of cards, with at least this much air above. */}
      <div aria-hidden className="min-h-5 flex-1" />
      <div className="flex items-center justify-between border-t border-ink/10 pt-4">
        <span className="text-xs text-on-surface-variant">{footer}</span>
        <span className="inline-flex items-center gap-1 rounded-pill bg-lime px-2.5 py-0.5 font-display text-sm font-bold text-ink opacity-0 transition-opacity group-hover:opacity-100">
          {room.status === "live" ? "Join" : room.status === "ended" ? "Report" : "Open"}{" "}
          <ArrowRight className="h-4 w-4" />
        </span>
      </div>
    </Link>
  );
}
