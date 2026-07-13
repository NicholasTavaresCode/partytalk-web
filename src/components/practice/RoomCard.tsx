import Link from "next/link";
import { ArrowRight, Users, Sparkles } from "lucide-react";
import type { Room } from "@/lib/types";
import { cn } from "@/lib/cn";

const STATUS: Record<Room["status"], { label: string; cls: string; dot: string; live?: boolean }> = {
  waiting: { label: "Waiting", cls: "bg-sky-50 text-sky-700 border-sky-200", dot: "bg-sky-500" },
  live: { label: "Live", cls: "bg-secondary/10 text-secondary border-secondary/20", dot: "bg-secondary", live: true },
  ended: {
    label: "Ended",
    cls: "bg-surface-container text-on-surface-variant border-outline-variant",
    dot: "bg-on-surface-variant",
  },
};

export function RoomCard({ room }: { room: Room }) {
  const s = STATUS[room.status];
  return (
    <Link
      href={`/practice/${room.id}`}
      className="group flex flex-col rounded-3xl border border-outline-variant bg-white p-6 transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-[0_18px_40px_-24px_rgba(0,30,64,0.4)]"
    >
      <div className="flex items-center justify-between">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-pill border px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide",
            s.cls,
          )}
        >
          <span className={cn("h-1.5 w-1.5 rounded-full", s.dot, s.live && "animate-pulse")} />
          {s.label}
        </span>
        <span className="inline-flex items-center gap-1 text-xs font-medium text-on-surface-variant">
          <Users className="h-3.5 w-3.5" />
          {room.participantIds.length}/{room.maxParticipants}
        </span>
      </div>

      <h3 className="mt-3 line-clamp-2 text-lg font-bold text-on-surface">{room.topic}</h3>

      {room.facilitatorPersona && (
        <p className="mt-2 line-clamp-2 flex items-start gap-1.5 text-sm leading-relaxed text-on-surface-variant">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          {room.facilitatorPersona}
        </p>
      )}

      <div className="mt-5 flex items-center justify-between border-t border-outline-variant pt-4">
        <span className="text-xs text-on-surface-variant">
          {room.status === "waiting"
            ? "Open to join"
            : room.status === "live"
              ? "In session"
              : "Session ended"}
        </span>
        <span className="inline-flex items-center gap-1 text-sm font-semibold text-primary opacity-0 transition-opacity group-hover:opacity-100">
          {room.status === "waiting" ? "Join" : "Open"} <ArrowRight className="h-4 w-4" />
        </span>
      </div>
    </Link>
  );
}
