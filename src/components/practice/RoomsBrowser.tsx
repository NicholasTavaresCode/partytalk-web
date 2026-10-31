"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Info, Mail, Plus, X, Radio, Sparkles, UserPlus } from "lucide-react";
import { useCreateRoom, useEndedRooms, useRooms } from "@/lib/queries";
import { ApiError } from "@/lib/apiClient";
import { buildCreateRoomInput } from "@/lib/roomForm";
import { ROOM_DURATIONS, type Room, type RoomDuration, type RoomStatus } from "@/lib/types";
import { cn } from "@/lib/cn";
import { useAuth } from "@/components/auth/AuthProvider";
import { EmailListInput, useEmailList } from "./EmailListInput";
import { splitRooms } from "@/lib/roomList";
import { InviteCard } from "./InviteCard";
import { RoomCard } from "./RoomCard";

/** Room sizes the API accepts, the owner included: 2–5 (no solo rooms; 5 is the P2P voice cap). */
const SEAT_OPTIONS = [2, 3, 4, 5];

const FILTERS: { label: string; value: "all" | RoomStatus }[] = [
  { label: "All", value: "all" },
  { label: "Open", value: "waiting" },
  { label: "Live", value: "live" },
  { label: "Ended", value: "ended" },
];

export function RoomsBrowser() {
  const { user } = useAuth();
  const [filter, setFilter] = useState<"all" | RoomStatus>("all");
  const [creating, setCreating] = useState(false);
  // Open rooms poll; past ones load only when asked for (GET /rooms?status=ended).
  const showingEnded = filter === "ended";
  const open = useRooms();
  const past = useEndedRooms(showingEnded);
  const { data: rooms, isLoading, isError, error } = showingEnded ? past : open;

  // The filter applies to both groups. Ended rooms have nothing to accept, so no invitations there.
  const { invites, mine } = useMemo(() => {
    if (showingEnded) return { invites: [], mine: rooms ?? [] };
    return splitRooms(
      (rooms ?? []).filter((r) => filter === "all" || r.status === filter),
      user?.uid ?? "",
    );
  }, [rooms, filter, showingEnded, user?.uid]);
  const empty = !isLoading && !isError && invites.length === 0 && mine.length === 0;

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={cn(
                "rounded-pill border-2 px-3.5 py-1.5 font-display text-sm font-bold transition-colors",
                filter === f.value
                  ? "border-ink bg-ink-fixed text-lime"
                  : "border-ink/15 bg-card text-on-surface-variant hover:border-ink hover:text-ink",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => setCreating(true)}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-pill border-2 border-ink bg-lime px-5 font-display text-[15px] font-bold text-ink-fixed shadow-pop-sm transition-all hover:translate-x-px hover:translate-y-px hover:bg-lime-light hover:shadow-none"
        >
          <Plus className="h-5 w-5" /> Create room
        </button>
      </div>

      {isError && (
        <p className="mt-6 rounded-2xl border border-error/30 bg-error-container/40 p-4 text-sm text-on-error-container">
          {error instanceof Error ? error.message : "Could not load rooms."}
        </p>
      )}

      {invites.length > 0 && (
        <section className="mt-8">
          <SectionTitle icon={<Mail className="h-4 w-4" />} count={invites.length}>
            Invitations
          </SectionTitle>
          <div className="mt-4 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {invites.map((room) => (
              <InviteCard key={room.id} room={room} />
            ))}
          </div>
        </section>
      )}

      <section className="mt-8">
        {invites.length > 0 && <SectionTitle count={mine.length}>Your rooms</SectionTitle>}
        <div className={cn("grid gap-5 md:grid-cols-2 lg:grid-cols-3", invites.length > 0 && "mt-4")}>
          {isLoading &&
            Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-52 animate-pulse rounded-3xl border-2 border-ink/10 bg-surface-container-low"
              />
            ))}

          {!isLoading && mine.map((room: Room) => <RoomCard key={room.id} room={room} uid={user?.uid} />)}

          {!isLoading && !showingEnded && (
            <button
              onClick={() => setCreating(true)}
              className="flex min-h-52 flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed border-ink/30 bg-surface-container-low/50 p-6 text-center transition-colors hover:border-ink hover:bg-card"
            >
              <span className="grid h-12 w-12 place-items-center rounded-full border-2 border-ink bg-lime text-ink-fixed shadow-pop-sm">
                <Plus className="h-6 w-6" />
              </span>
              <p className="font-display font-bold text-ink">Start a new room</p>
              <p className="text-sm text-on-surface-variant">
                Pick a topic, or let the AI host pick one. It keeps the conversation moving.
              </p>
            </button>
          )}
        </div>
      </section>

      {empty && (
        <div className="mt-4 flex flex-col items-center gap-2 rounded-3xl border-2 border-ink/15 bg-card py-16 text-center">
          <Radio className="h-6 w-6 text-purple-fg" />
          <p className="font-semibold text-on-surface">
            {showingEnded
              ? "No ended rooms yet"
              : filter === "all"
                ? "No rooms or invitations yet"
                : `Nothing ${filter === "live" ? "live" : "open"} right now`}
          </p>
          <p className="text-sm text-on-surface-variant">
            {showingEnded
              ? "Rooms you hosted or were invited to show up here once they end, with their report."
              : "Start one, or ask a host to invite you: invitations show up here as well as in your email."}
          </p>
        </div>
      )}

      {creating && <CreateRoomModal onClose={() => setCreating(false)} />}
    </div>
  );
}

function SectionTitle({
  icon,
  count,
  children,
}: {
  icon?: React.ReactNode;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <h2 className="flex items-center gap-2 font-display text-xl font-extrabold tracking-tight text-ink">
      {icon && (
        <span className="grid h-7 w-7 place-items-center rounded-full border-2 border-ink bg-purple text-white">
          {icon}
        </span>
      )}
      {children}
      <span className="font-label text-sm font-bold text-on-surface-variant">({count})</span>
    </h2>
  );
}

function CreateRoomModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const create = useCreateRoom();
  const { user } = useAuth();
  const [topic, setTopic] = useState("");
  const [hostPicksTopic, setHostPicksTopic] = useState(false);
  const [maxParticipants, setMaxParticipants] = useState(5);
  const [durationMinutes, setDurationMinutes] = useState<RoomDuration>(30);
  const topicRef = useRef<HTMLInputElement>(null);
  const seats = maxParticipants - 1; // the owner takes one
  const invites = useEmailList(user?.email, seats);
  const invited = invites.emails.length;
  // Lowering the room size below the people already invited: they must be removed first.
  const overInvited = invited > seats;
  // Don't throw away a half-filled form on a stray click outside it.
  const dirty = !!topic.trim() || invited > 0 || !!invites.draft.trim();

  const input = buildCreateRoomInput({
    topic,
    hostPicksTopic,
    maxParticipants,
    durationMinutes,
    invitedEmails: invites.emails,
  });
  const hostUnavailable = create.isError && create.error instanceof ApiError && create.error.status === 503;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input) return;
    // Includes an address still typed in the field; null = it isn't an email (error shown).
    const invitedEmails = invites.flush();
    if (!invitedEmails) return;
    create.mutate({ ...input, invitedEmails }, { onSuccess: (room) => router.push(`/practice/${room.id}`) });
  };

  const typeMyOwn = () => {
    create.reset();
    setHostPicksTopic(false);
    setTimeout(() => topicRef.current?.focus(), 0);
  };

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-ink-fixed/50 p-4 backdrop-blur-sm"
      onClick={() => {
        if (!dirty) onClose();
      }}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        className="flex max-h-[calc(100dvh-2rem)] w-full max-w-lg flex-col rounded-3xl border-2 border-ink bg-card shadow-pop-lg"
      >
        <div className="flex items-center justify-between border-b border-ink/10 px-7 pb-4 pt-6">
          <h2 className="font-display text-xl font-extrabold tracking-tight text-ink">Create a room</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-1 hover:bg-surface-container">
            <X className="h-5 w-5 text-on-surface-variant" />
          </button>
        </div>

        {/* Scrolls on short screens; the title and the buttons stay put. */}
        <div className="thin-scroll min-h-0 flex-1 overflow-y-auto px-7 pb-5 pt-5">
          <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border-2 border-ink/15 px-3.5 py-3">
            <span className="flex items-center gap-2 text-sm font-semibold text-on-surface">
              <Sparkles className="h-4 w-4 text-purple-fg" /> Let the AI host pick the opening topic
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
              className="h-5 w-5 accent-purple"
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
                className="mt-1.5 h-11 w-full rounded-xl border-2 border-ink/15 bg-card px-3 outline-none transition-colors focus:border-ink"
                maxLength={120}
                autoFocus
              />
            </>
          )}

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <span className="text-sm font-semibold text-on-surface">Length</span>
            <div className="flex flex-wrap items-center gap-2">
              {ROOM_DURATIONS.map((n) => (
                <button
                  type="button"
                  key={n}
                  onClick={() => setDurationMinutes(n)}
                  className={cn(
                    "h-9 px-3",
                    "rounded-pill border-2 font-display text-sm font-bold transition-colors",
                    durationMinutes === n
                      ? "border-ink bg-ink-fixed text-lime"
                      : "border-ink/15 text-on-surface-variant hover:border-ink/40",
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

          <div className="mt-5 flex items-center justify-between">
            <span className="text-sm font-semibold text-on-surface">People in the room</span>
            <div className="flex items-center gap-2">
              {SEAT_OPTIONS.map((n) => (
                <button
                  type="button"
                  key={n}
                  onClick={() => setMaxParticipants(n)}
                  className={cn(
                    "h-9 w-9",
                    "rounded-pill border-2 font-display text-sm font-bold transition-colors",
                    maxParticipants === n
                      ? "border-ink bg-ink-fixed text-lime"
                      : "border-ink/15 text-on-surface-variant hover:border-ink/40",
                  )}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
          {/* Next to the seat picker, where the eye is when it changes. */}
          {overInvited ? (
            <p className="mt-2 flex items-start gap-2 rounded-xl border-2 border-error/40 bg-error-container/50 px-3 py-2 text-xs text-on-error-container">
              <Info className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
              {`${invited} invited, but a room for ${maxParticipants} has ${seats} ${seats === 1 ? "spot" : "spots"} besides you. Remove ${invited - seats} or pick a bigger room.`}
            </p>
          ) : (
            <p className="mt-1.5 text-xs text-on-surface-variant">
              You count as one, so 2 is you and one guest.
            </p>
          )}

          <div className="mt-5 flex items-center justify-between gap-3">
            <label htmlFor="invite-email" className="flex items-center gap-1.5 text-sm font-semibold text-on-surface">
              <UserPlus className="h-4 w-4 text-purple-fg" /> Invite people
            </label>
            {invited > 0 && (
              <span className="flex items-center gap-2 text-xs text-on-surface-variant">
                {invited} invited
                {invited > 1 && (
                  <>
                    <span aria-hidden>·</span>
                    <button type="button" onClick={invites.clear} className="font-semibold text-purple-fg hover:underline">
                      Remove all
                    </button>
                  </>
                )}
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-on-surface-variant">
            Only you and these Google accounts can join, one per spot. Each one gets an email with the room link.
          </p>
          <EmailListInput list={invites} id="invite-email" />

          {hostUnavailable ? (
            <div className="mt-4 rounded-2xl border-2 border-ink bg-lime/25 p-3.5 text-sm text-on-surface">
              <p className="font-semibold">The host couldn&apos;t pick a topic right now.</p>
              <p className="mt-1 text-on-surface-variant">Try again in a moment, or type a topic yourself.</p>
              <div className="mt-2.5 flex gap-2">
                <button
                  type="submit"
                  disabled={create.isPending}
                  className="h-9 rounded-pill border-2 border-ink bg-ink font-display font-bold text-cream shadow-pop-sm transition-all hover:translate-x-px hover:translate-y-px hover:shadow-none px-4 text-sm disabled:opacity-50"
                >
                  {create.isPending ? "Trying…" : "Try again"}
                </button>
                <button type="button" onClick={typeMyOwn} className="h-9 rounded-pill border-2 border-ink bg-card font-display font-bold text-ink transition-colors hover:bg-lime/30 px-4 text-sm">
                  Type one myself
                </button>
              </div>
            </div>
          ) : create.isError ? (
            <p className="mt-4 text-sm font-medium text-error">
              {create.error instanceof Error ? create.error.message : "Could not create room"}
            </p>
          ) : null}
        </div>

        <div className="flex justify-end gap-3 border-t border-ink/10 px-7 py-4">
          <button type="button" onClick={onClose} className="h-11 rounded-pill border-2 border-ink bg-card font-display font-bold text-ink transition-colors hover:bg-lime/30 px-5">
            Cancel
          </button>
          <button
            type="submit"
            disabled={create.isPending || !input || overInvited}
            className="h-11 rounded-pill border-2 border-ink bg-lime px-6 font-display font-bold text-ink-fixed shadow-pop-sm transition-all hover:translate-x-px hover:translate-y-px hover:bg-lime-light hover:shadow-none disabled:opacity-50"
          >
            {create.isPending ? "Creating…" : invited ? `Create & invite ${invited}` : "Create & enter"}
          </button>
        </div>
      </form>
    </div>
  );
}
