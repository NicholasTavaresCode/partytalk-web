"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, Radio, Sparkles } from "lucide-react";
import { useRooms, useCreateRoom } from "@/lib/queries";
import { ApiError } from "@/lib/apiClient";
import { buildCreateRoomInput } from "@/lib/roomForm";
import { ROOM_DURATIONS, type Room, type RoomDuration, type RoomStatus } from "@/lib/types";
import { cn } from "@/lib/cn";
import { useAuth } from "@/components/auth/AuthProvider";
import { EmailListInput, useEmailList } from "./EmailListInput";
import { RoomCard } from "./RoomCard";

const FILTERS: { label: string; value: "all" | RoomStatus }[] = [
  { label: "All", value: "all" },
  { label: "Open", value: "waiting" },
  { label: "Live", value: "live" },
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
  const [hostPicksTopic, setHostPicksTopic] = useState(false);
  const [maxParticipants, setMaxParticipants] = useState(5);
  const [durationMinutes, setDurationMinutes] = useState<RoomDuration>(30);
  const topicRef = useRef<HTMLInputElement>(null);

  const input = buildCreateRoomInput({ topic, hostPicksTopic, maxParticipants, durationMinutes });
  const hostUnavailable = create.isError && create.error instanceof ApiError && create.error.status === 503;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input) return;
    create.mutate(input, { onSuccess: (room) => router.push(`/practice/${room.id}`) });
  };

  const typeMyOwn = () => {
    create.reset();
    setHostPicksTopic(false);
    setTimeout(() => topicRef.current?.focus(), 0);
  };

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
      onClick={() => {
        if (!dirty) onClose();
      }}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        className="flex max-h-[calc(100dvh-2rem)] w-full max-w-lg flex-col rounded-3xl border border-outline-variant bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-outline-variant px-7 pb-4 pt-6">
          <h2 className="font-display text-xl font-extrabold tracking-tight text-primary">
            Create a room
          </h2>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-1 hover:bg-surface-container">
            <X className="h-5 w-5 text-on-surface-variant" />
          </button>
        </div>

        <label className="mt-6 flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-outline-variant px-3.5 py-3">
          <span className="flex items-center gap-2 text-sm font-semibold text-on-surface">
            <Sparkles className="h-4 w-4 text-primary" /> Let the AI host pick the opening topic
          </span>
          <input
            type="checkbox"
            role="switch"
            aria-checked={hostPicksTopic}
            checked={hostPicksTopic}
            onChange={(e) => {
              create.reset();
              setHostPicksTopic(e.target.checked);
            }}
            className="h-5 w-5 accent-primary"
          />
        </label>

        {hostPicksTopic ? (
          <p className="mt-3 text-sm text-on-surface-variant">
            The host will choose something to get the group talking — it&apos;s shown on the room once
            it&apos;s created.
          </p>
        ) : (
          <>
            <label htmlFor="opening-topic" className="mt-5 block text-sm font-semibold text-on-surface">
              Opening topic
            </label>
            <input
              id="opening-topic"
              ref={topicRef}
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Weekend plans, first jobs, favourite films…"
              className="mt-1.5 h-11 w-full rounded-lg border border-outline-variant px-3 outline-none focus:border-primary"
              maxLength={120}
              autoFocus
            />
          </>
        )}

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

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <span className="text-sm font-semibold text-on-surface">Length</span>
          <div className="flex items-center gap-2">
            {ROOM_DURATIONS.map((n) => (
              <button
                type="button"
                key={n}
                onClick={() => setDurationMinutes(n)}
                className={cn(
                  "h-9 rounded-lg border px-3 text-sm font-bold transition-colors",
                  durationMinutes === n
                    ? "border-primary bg-primary text-on-primary"
                    : "border-outline-variant text-on-surface-variant hover:border-primary/40",
                )}
              >
                {n} min
              </button>
            ))}
          </div>
        </div>
        <p className="mt-1.5 text-xs text-on-surface-variant">
          The session ends by itself when the time is up and everyone gets the report.
        </p>

        {hostUnavailable ? (
          <div className="mt-4 rounded-xl border border-tertiary-fixed-dim bg-tertiary-fixed/20 p-3.5 text-sm text-on-surface">
            <p className="font-semibold">The host couldn&apos;t pick a topic right now.</p>
            <p className="mt-1 text-on-surface-variant">Try again in a moment, or type a topic yourself.</p>
            <div className="mt-2.5 flex gap-2">
              <button
                type="submit"
                disabled={create.isPending}
                className="h-9 rounded-lg bg-primary px-4 text-sm font-semibold text-on-primary hover:opacity-90 disabled:opacity-50"
              >
                {create.isPending ? "Trying…" : "Try again"}
              </button>
              <button
                type="button"
                onClick={typeMyOwn}
                className="h-9 rounded-lg border border-outline px-4 text-sm font-semibold text-on-surface-variant hover:bg-surface-container-low"
              >
                Type one myself
              </button>
            </div>
          </div>
        ) : create.isError ? (
          <p className="mt-4 text-sm font-medium text-error">
            {create.error instanceof Error ? create.error.message : "Could not create room"}
          </p>
        ) : null}

        <div className="flex justify-end gap-3 border-t border-outline-variant px-7 py-4">
          <button
            type="button"
            onClick={onClose}
            className="h-11 rounded-lg border border-outline px-5 font-semibold text-on-surface-variant hover:bg-surface-container-low"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={create.isPending || !input}
            className="h-11 rounded-lg bg-primary px-6 font-semibold text-on-primary transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {create.isPending ? "Creating…" : invited ? `Create & invite ${invited}` : "Create & enter"}
          </button>
        </div>
      </form>
    </div>
  );
}
