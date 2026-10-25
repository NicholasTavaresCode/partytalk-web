"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, Sparkles, Radio, UserPlus } from "lucide-react";
import { useRooms, useCreateRoom } from "@/lib/queries";
import type { Room, RoomStatus } from "@/lib/types";
import { cn } from "@/lib/cn";
import { useAuth } from "@/components/auth/AuthProvider";
import { EmailListInput, useEmailList } from "./EmailListInput";
import { RoomCard } from "./RoomCard";

const FILTERS: { label: string; value: "all" | RoomStatus }[] = [
  { label: "All", value: "all" },
  { label: "Open", value: "waiting" },
  { label: "Live", value: "live" },
];

const PERSONAS = [
  "An encouraging coach who keeps everyone talking and celebrates good phrasing.",
  "A curious interviewer who asks unexpected follow-up questions.",
  "A playful debater who nudges people to defend an opinion.",
  "A calm facilitator who keeps the group on a single thread.",
];

export function RoomsBrowser() {
  const { data: rooms, isLoading, isError, error } = useRooms();
  const [filter, setFilter] = useState<"all" | RoomStatus>("all");
  const [creating, setCreating] = useState(false);

  const filtered = useMemo(
    () => (rooms ?? []).filter((r) => filter === "all" || r.status === filter),
    [rooms, filter],
  );

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={cn(
                "rounded-pill border px-3.5 py-1.5 text-sm font-semibold transition-colors",
                filter === f.value
                  ? "border-primary bg-primary text-on-primary"
                  : "border-outline-variant bg-white text-on-surface-variant hover:border-primary/40 hover:text-primary",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => setCreating(true)}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-[15px] font-semibold text-on-primary transition-opacity hover:opacity-90"
        >
          <Plus className="h-5 w-5" /> Create room
        </button>
      </div>

      {isError && (
        <p className="mt-6 rounded-2xl border border-error/30 bg-error-container/40 p-4 text-sm text-on-error-container">
          {error instanceof Error ? error.message : "Could not load rooms."}
        </p>
      )}

      <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {isLoading &&
          Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-52 animate-pulse rounded-3xl border border-outline-variant bg-surface-container-low"
            />
          ))}

        {!isLoading && filtered.map((room: Room) => <RoomCard key={room.id} room={room} />)}

        {!isLoading && (
          <button
            onClick={() => setCreating(true)}
            className="flex min-h-52 flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed border-outline-variant bg-surface-container-low/50 p-6 text-center transition-colors hover:border-primary/40 hover:bg-white"
          >
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary text-on-primary">
              <Plus className="h-6 w-6" />
            </span>
            <p className="font-bold text-on-surface">Start a new room</p>
            <p className="text-sm text-on-surface-variant">
              Pick a topic — an AI host joins and suggests new ones as you talk.
            </p>
          </button>
        )}
      </div>

      {!isLoading && !isError && filtered.length === 0 && (
        <div className="mt-4 flex flex-col items-center gap-2 rounded-3xl border border-outline-variant bg-white py-16 text-center">
          <Radio className="h-6 w-6 text-primary" />
          <p className="font-semibold text-on-surface">No rooms here yet</p>
          <p className="text-sm text-on-surface-variant">
            Start one, or ask a host to invite you — you only see rooms you&apos;re invited to.
          </p>
        </div>
      )}

      {creating && <CreateRoomModal onClose={() => setCreating(false)} />}
    </div>
  );
}

function CreateRoomModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const create = useCreateRoom();
  const [topic, setTopic] = useState("");
  const [persona, setPersona] = useState(PERSONAS[0]);
  const [maxParticipants, setMaxParticipants] = useState(5);
  const { user } = useAuth();
  const invites = useEmailList(user?.email);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;
    // Includes an address still typed in the field; null = it isn't an email (error shown).
    const invitedEmails = invites.flush();
    if (!invitedEmails) return;
    create.mutate(
      {
        topic: topic.trim(),
        facilitatorPersona: persona,
        maxParticipants,
        invitedEmails,
      },
      { onSuccess: (room) => router.push(`/practice/${room.id}`) },
    );
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={onClose}>
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        className="w-full max-w-lg rounded-3xl border border-outline-variant bg-white p-7 shadow-2xl"
      >
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-extrabold tracking-tight text-primary">
            Create a room
          </h2>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-1 hover:bg-surface-container">
            <X className="h-5 w-5 text-on-surface-variant" />
          </button>
        </div>

        <label className="mt-6 block text-sm font-semibold text-on-surface">Opening topic</label>
        <input
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="e.g. Weekend plans, first jobs, favourite films…"
          className="mt-1.5 h-11 w-full rounded-lg border border-outline-variant px-3 outline-none focus:border-primary"
          maxLength={120}
          autoFocus
        />

        <p className="mt-5 flex items-center gap-1.5 text-sm font-semibold text-on-surface">
          <Sparkles className="h-4 w-4 text-primary" /> AI host style
        </p>
        <div className="mt-2 grid gap-2">
          {PERSONAS.map((p) => (
            <button
              type="button"
              key={p}
              onClick={() => setPersona(p)}
              className={cn(
                "rounded-xl border px-3.5 py-2.5 text-left text-sm transition-colors",
                persona === p
                  ? "border-primary bg-primary-fixed/40 text-on-surface"
                  : "border-outline-variant text-on-surface-variant hover:border-primary/40",
              )}
            >
              {p}
            </button>
          ))}
        </div>

        <div className="mt-5 flex items-center justify-between">
          <span className="text-sm font-semibold text-on-surface">Max participants</span>
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                type="button"
                key={n}
                onClick={() => setMaxParticipants(n)}
                className={cn(
                  "h-9 w-9 rounded-lg border text-sm font-bold transition-colors",
                  maxParticipants === n
                    ? "border-primary bg-primary text-on-primary"
                    : "border-outline-variant text-on-surface-variant hover:border-primary/40",
                )}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
        <p className="mt-1.5 text-xs text-on-surface-variant">
          Pick 1 for a solo test room. Capped at 5 while voice runs over a peer-to-peer mesh.
        </p>

        <label className="mt-5 flex items-center gap-1.5 text-sm font-semibold text-on-surface">
          <UserPlus className="h-4 w-4 text-primary" /> Invite people
        </label>
        <EmailListInput list={invites} />
        <p className="mt-1.5 text-xs text-on-surface-variant">
          Rooms are invite-only: just you and these Google accounts can see or join. You can add
          people or share an invite link from inside the room.
        </p>

        {create.isError && (
          <p className="mt-4 text-sm font-medium text-error">
            {create.error instanceof Error ? create.error.message : "Could not create room"}
          </p>
        )}

        <div className="mt-7 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="h-11 rounded-lg border border-outline px-5 font-semibold text-on-surface-variant hover:bg-surface-container-low"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={create.isPending || !topic.trim()}
            className="h-11 rounded-lg bg-primary px-6 font-semibold text-on-primary transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {create.isPending ? "Creating…" : "Create & enter"}
          </button>
        </div>
      </form>
    </div>
  );
}
