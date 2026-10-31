"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Mic,
  MicOff,
  PhoneOff,
  Play,
  Crown,
  Lightbulb,
  CheckCircle2,
  Loader2,
  Shuffle,
  Volume2,
  VolumeX,
  GraduationCap,
  Sparkles,
  Timer,
  UserPlus,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { ApiError } from "@/lib/apiClient";
import { formatCountdown, useCountdown } from "@/lib/countdown";
import { useAuth } from "@/components/auth/AuthProvider";
import { queryKeys, useMe, useRoom, useRoomLifecycle } from "@/lib/queries";
import { useRoomSocket } from "@/lib/useRoomSocket";
import { useSpeechRecognition } from "@/lib/useSpeechRecognition";
import { useVoiceMesh } from "@/lib/useVoiceMesh";
import { useHostVoice } from "@/lib/hostVoice";
import { useAudioLevel, useRecentSpeakers } from "@/lib/useSpeaking";
import { currentTopic } from "@/lib/roomHistory";
import { Logo } from "@/components/brand/Logo";
import { ParticipantAvatar } from "@/components/practice/ParticipantAvatar";
import { LoadingScreen } from "@/components/app/LoadingScreen";
import { VoiceBars } from "@/components/practice/room/VoiceBars";
import { RoomQuestSummary } from "@/components/quests/RoomQuestSummary";
import { InvitePanel } from "./InvitePanel";
import { RoomAccessScreen } from "./RoomAccessScreen";
import { cn } from "@/lib/cn";
import type { HostMessage, HostMessageTrigger, RoomReport } from "@/lib/types";

const TRIGGER: Record<HostMessageTrigger, string> = {
  volume: "Topic covered",
  silence: "Room went quiet",
  manual: "On request",
};

const clock = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

/**
 * The live room. Rooms are invite-only: the API answers 403 until the signed-in
 * account is invited, so `inviteCode` (from an owner's invite link) is redeemed
 * by joining; without one the visitor gets the "invite-only" screen.
 */
export function RoomExperience({ roomId, inviteCode }: { roomId: string; inviteCode?: string }) {
  const router = useRouter();
  const { user } = useAuth();
  const { data: me } = useMe();
  const { data: room, isLoading, error: roomError } = useRoom(roomId);
  const { join, leave, start, end, changeTopic } = useRoomLifecycle(roomId);
  const roomErrorStatus = roomError instanceof ApiError ? roomError.status : undefined;
  // Only open the socket once we're actually in the room (see useRoomSocket).
  const isParticipant = !!room && !!user && room.participantIds.includes(user.uid);
  const rt = useRoomSocket(roomId, { enabled: isParticipant });
  const live = room?.status === "live";

  const [hostMuted, setHostMuted] = useState(false);
  const [invitesOpen, setInvitesOpen] = useState(false);
  // The mic can be on before the room starts (like Meet's lobby); words only go
  // out once the session is live and the host is listening.
  const stt = useSpeechRecognition((text) => {
    if (live) rt.sendTranscript(text);
  });
  // One mic button drives both what the AI hears (speech-to-text) and what the
  // others hear (the voice mesh). Without speech-to-text (e.g. Firefox) it still
  // mutes and unmutes your voice; the AI just can't hear you.
  const [micOnNoStt, setMicOnNoStt] = useState(false);
  const micOn = stt.supported ? stt.listening : micOnNoStt;
  const toggleMic = () => {
    if (stt.supported) {
      if (stt.listening) stt.stop();
      else stt.start();
    } else {
      setMicOnNoStt((on) => !on);
    }
  };
  const voice = useVoiceMesh({
    socket: rt.socket,
    roomId,
    enabled: live && isParticipant && !rt.removed,
    selfUid: user?.uid,
    muted: !micOn,
  });

  // Revoked mid-session: stop listening right away (the server already ignores us).
  useEffect(() => {
    if (rt.removed) stt.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `stt` is a fresh object each render
  }, [rt.removed]);
  const hostVoice = useHostVoice(rt.hostMessages, hostMuted);
  const recent = useRecentSpeakers(rt.segments);
  const qc = useQueryClient();
  const remaining = useCountdown(room?.status === "live" ? room.scheduledEndAt : undefined);

  // The backend ends the session at scheduledEndAt and emits `sessionEnded`, which is
  // handled like an owner-initiated end. If that event is missed (e.g. a reconnect),
  // refetch once the clock runs out so we still land on the report.
  useEffect(() => {
    if (remaining === 0 && !rt.ended) {
      void qc.invalidateQueries({ queryKey: queryKeys.room(roomId) });
    }
  }, [remaining, rt.ended, qc, roomId]);

  // Take a seat once (idempotent server-side). Invitees just join; a visitor with
  // an invite link redeems it — the room itself stays 403 until they do.
  const joinedRef = useRef(false);
  useEffect(() => {
    if (!user || joinedRef.current) return;
    const needsSeat = room
      ? !room.participantIds.includes(user.uid) && room.status !== "ended"
      : roomErrorStatus === 403 && !!inviteCode;
    if (!needsSeat) return;
    joinedRef.current = true;
    join.mutate(inviteCode, {
      // The code has done its job — keep it out of the address bar and history.
      onSuccess: () => {
        if (inviteCode) router.replace(`/practice/${roomId}`);
      },
    });
  }, [room, roomErrorStatus, user, join, inviteCode, router, roomId]);

  const remoteByUid = useMemo(
    () => new Map(voice.remoteStreams.map((r) => [r.uid, r.stream])),
    [voice.remoteStreams],
  );
  // Newest first for the host bar's history; already deduped by id.
  const hostHistory = useMemo(
    () => [...rt.hostMessages].sort((a, b) => b.at.localeCompare(a.at)),
    [rt.hostMessages],
  );

  if (rt.removed) return <RoomAccessScreen reason="removed" />;
  if (roomErrorStatus === 404) return <RoomAccessScreen reason="not-found" />;
  if (roomErrorStatus === 403 && (!inviteCode || join.isError)) {
    return (
      <RoomAccessScreen
        reason="not-invited"
        email={user?.email}
        detail={
          inviteCode && join.error instanceof Error
            ? `The invite link didn't work: ${join.error.message}`
            : undefined
        }
      />
    );
  }
  if (isLoading || !room) return <LoadingScreen label="Joining room…" />;

  const isOwner = room.ownerId === user?.uid;
  const report: RoomReport | null | undefined = room.report ?? (rt.ended ? rt.endedReport : undefined);
  const isEnded = room.status === "ended" || rt.ended;

  if (isEnded) return <ReportView roomId={roomId} topic={room.topic} report={report} />;

  const selfName = me?.displayName ?? user?.displayName ?? "You";
  // `room.topic` is only the opening topic; the host's latest line sets the current one.
  const topic = currentTopic(rt.hostMessages, room.topic);

  return (
    <div className="relative isolate flex h-[100dvh] flex-col bg-cream text-ink">
      <div aria-hidden className="bg-dots pointer-events-none absolute inset-0 -z-10" />

      {/* Header, like the landing's: the room, its status and clock, and who can join. */}
      <header className="z-30 flex h-16 shrink-0 items-center justify-between gap-3 border-b border-ink/5 bg-cream/90 px-4 backdrop-blur-md sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Logo className="h-9 w-9 shrink-0" />
          <div className="min-w-0">
            <p className="flex min-w-0 items-center gap-2 font-display text-base font-bold leading-tight">
              <span className="truncate">{room.topic}</span>
              <StatusChip live={live} />
            </p>
            <p className="truncate text-[11px] font-medium text-on-surface-variant">
              {room.participantIds.length} of {room.maxParticipants} seats
              {room.durationMinutes != null && <> · {room.durationMinutes}-min session</>}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {live && remaining !== null && <Countdown ms={remaining} />}
          {isOwner && (
            <button
              onClick={() => setInvitesOpen((v) => !v)}
              aria-expanded={invitesOpen}
              title={room.status === "waiting" ? "Who can join" : "Guest list (locked once the room starts)"}
              className={cn(
                "inline-flex h-9 items-center gap-1.5 rounded-pill border-2 px-3 font-display text-sm font-bold transition-colors",
                invitesOpen ? "border-ink bg-ink-fixed text-lime" : "border-ink/15 bg-card text-ink hover:border-ink",
              )}
            >
              <UserPlus className="h-4 w-4" />
              <span className="hidden sm:inline">{room.status === "waiting" ? "Invite" : "Guests"}</span>
              {!!room.invitedEmails?.length && <span className="opacity-70">{room.invitedEmails.length}</span>}
            </button>
          )}
        </div>
      </header>

      <main className="relative mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col gap-4 p-4 sm:p-6">
        {/* The host is not a participant and has no tile: it listens in and speaks up
            through this banner when it changes the topic. */}
        <HostBanner
          live={live}
          topic={topic}
          openingTopic={room.topic}
          openingPickedByHost={room.topicPickedByHost === true}
          latest={rt.latestHostMessage}
          history={hostHistory}
          speaking={hostVoice.speaking}
          muted={hostMuted}
        />

        <div className="min-h-0 flex-1 overflow-y-auto p-1">
          <div
            className={cn(
              "mx-auto grid h-full max-w-4xl auto-rows-fr place-content-center gap-3 sm:gap-4",
              gridColsClass(room.participantIds.length),
            )}
          >
            {room.participantIds.map((uid) =>
              uid === user?.uid ? (
                <SelfTile
                  key={uid}
                  name={selfName}
                  owner={uid === room.ownerId}
                  stream={micOn ? voice.localStream : null}
                  micOn={micOn}
                />
              ) : (
                <PeerTile
                  key={uid}
                  name={rt.presence[uid] ?? "Guest"}
                  owner={uid === room.ownerId}
                  online={rt.presence[uid] !== undefined}
                  stream={remoteByUid.get(uid) ?? null}
                  recentlySpoke={recent.has(uid)}
                />
              ),
            )}
          </div>
        </div>

        {isOwner && invitesOpen && <InvitePanel room={room} onClose={() => setInvitesOpen(false)} />}

        {start.isError && !(start.error instanceof ApiError && start.error.status === 409) ? (
          <Toast tone="error">Couldn&apos;t start: {start.error.message}</Toast>
        ) : rt.error ? (
          <Toast tone="error">{rt.error}</Toast>
        ) : isParticipant && !rt.connected ? (
          <Toast>Connecting to the room…</Toast>
        ) : null}
      </main>

      {/* Control dock */}
      <footer className="shrink-0 px-4 pb-4 pt-1">
        <div className="mx-auto flex w-fit max-w-full items-center gap-2 rounded-pill border-2 border-ink bg-card p-2 shadow-pop sm:gap-3">
          <CtrlButton
            title={
              micOn
                ? "Turn off microphone"
                : !stt.supported
                  ? "Turn on microphone (this browser has no speech-to-text, so the AI host can't hear you — use Chrome or Edge)"
                  : !live
                    ? "Turn on microphone (the AI host starts listening when the room starts)"
                    : !rt.connected
                      ? "Turn on microphone (reconnecting to the room…)"
                      : "Turn on microphone"
            }
            active={micOn}
            off={!micOn}
            onClick={toggleMic}
          >
            {micOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
          </CtrlButton>

          <CtrlButton
            title={
              !hostVoice.supported
                ? "Host voice isn't available in this browser"
                : hostMuted
                  ? "Unmute AI host"
                  : "Mute AI host"
            }
            off={hostMuted}
            disabled={!hostVoice.supported}
            onClick={() => setHostMuted((v) => !v)}
          >
            {hostMuted || !hostVoice.supported ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
          </CtrlButton>

          {isOwner && live && (
            <CtrlButton
              title="Change topic"
              disabled={changeTopic.isPending}
              onClick={() => changeTopic.mutate(undefined, { onSuccess: (m) => rt.addHostMessage(m) })}
            >
              {changeTopic.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Shuffle className="h-5 w-5" />}
            </CtrlButton>
          )}

          {isOwner && !live && (
            <button
              onClick={() => start.mutate()}
              disabled={start.isPending}
              className="inline-flex h-12 items-center gap-2 rounded-pill border-2 border-ink bg-lime px-5 font-display font-bold text-ink-fixed shadow-pop-sm transition-all hover:translate-x-px hover:translate-y-px hover:bg-lime-light hover:shadow-none disabled:opacity-60"
            >
              <Play className="h-5 w-5" /> {start.isPending ? "Starting…" : "Start"}
            </button>
          )}

          {isOwner && live ? (
            <button
              onClick={() => end.mutate()}
              disabled={end.isPending}
              title="End for everyone"
              className="inline-flex h-12 items-center gap-2 rounded-pill border-2 border-ink bg-danger px-5 font-display font-bold text-white shadow-pop-sm transition-all hover:translate-x-px hover:translate-y-px hover:shadow-none disabled:opacity-60"
            >
              <PhoneOff className="h-5 w-5" /> {end.isPending ? "Ending…" : "End"}
            </button>
          ) : (
            // Leaving gives the seat back (rooms cap at 5), then goes — even if the call fails.
            <button
              onClick={() => leave.mutate(undefined, { onSettled: () => router.push("/practice") })}
              disabled={leave.isPending}
              title="Leave"
              aria-label="Leave"
              className="grid h-12 w-16 place-items-center rounded-pill border-2 border-ink bg-danger text-white shadow-pop-sm transition-all hover:translate-x-px hover:translate-y-px hover:shadow-none disabled:opacity-60"
            >
              {leave.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <PhoneOff className="h-5 w-5" />}
            </button>
          )}
        </div>
      </footer>

      {/* Hidden remote audio (P2P mesh) */}
      {voice.remoteStreams.map((r) => (
        <RemoteAudio key={r.uid} stream={r.stream} />
      ))}
    </div>
  );
}

function StatusChip({ live }: { live: boolean }) {
  return live ? (
    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-pill bg-coral/15 px-2 py-px font-label text-[10px] font-bold uppercase tracking-wider text-secondary">
      <span className="relative flex h-2 w-2">
        <span className="absolute inset-0 rounded-full bg-lime motion-safe:animate-ping text-ink-fixed" />
        <span className="relative h-2 w-2 rounded-full border border-ink bg-lime text-ink-fixed" />
      </span>
      Live
    </span>
  ) : (
    <span className="inline-flex shrink-0 items-center rounded-pill bg-purple-light px-2 py-px font-label text-[10px] font-bold uppercase tracking-wider text-purple-fg">
      Waiting
    </span>
  );
}

function Toast({ tone = "info", children }: { tone?: "info" | "error"; children: React.ReactNode }) {
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "absolute bottom-4 left-1/2 z-10 max-w-[calc(100%-2rem)] -translate-x-1/2 truncate whitespace-nowrap rounded-pill border-2 border-ink px-4 py-2 text-xs font-semibold shadow-pop-sm sm:text-sm",
        tone === "error" ? "bg-danger text-white" : "bg-card text-ink",
      )}
    >
      {children}
    </p>
  );
}

/* --------------------------------- Tiles --------------------------------- */

/** Column count that keeps the cards a comfortable size as the room fills. */
function gridColsClass(n: number): string {
  if (n <= 1) return "grid-cols-1";
  if (n <= 2) return "grid-cols-1 sm:grid-cols-2";
  if (n <= 4) return "grid-cols-2";
  return "grid-cols-2 md:grid-cols-3";
}

/** A person in the room, as the landing's room card shows them: lime and lifted while they speak. */
function Tile({
  name,
  you = false,
  owner,
  online = true,
  speaking,
  level,
  status,
}: {
  name: string;
  /** Your own tile: the label says so (the avatar keeps your initials). */
  you?: boolean;
  owner?: boolean;
  online?: boolean;
  speaking: boolean;
  level?: number;
  /** Shown while not speaking. */
  status: "listening" | "mic-off" | "offline";
}) {
  return (
    <div
      className={cn(
        "relative flex min-h-[9rem] flex-col items-center justify-center gap-3 rounded-3xl border-2 p-4 transition-all duration-150",
        speaking
          ? "-translate-y-0.5 border-ink bg-lime/25 shadow-pop"
          : "border-ink/10 bg-card",
        !online && "opacity-60",
      )}
    >
      <ParticipantAvatar
        name={name}
        size={80}
        className={cn("border-2 border-ink transition-transform duration-150", speaking && "scale-105")}
      />
      <div className="flex max-w-full flex-col items-center gap-1.5">
        <p className="flex max-w-full items-center gap-1.5 font-display text-sm font-bold text-ink">
          <span className="truncate">{you ? `${name} (You)` : name}</span>
          {owner && <Crown className="h-3.5 w-3.5 shrink-0 text-purple-fg" aria-label="Room owner" />}
        </p>
        {speaking ? (
          <VoiceBars level={level} size={24} />
        ) : status === "mic-off" ? (
          <span className="inline-flex items-center gap-1 rounded-pill bg-coral/15 px-2 py-0.5 text-[11px] font-semibold text-secondary">
            <MicOff className="h-3 w-3" /> Mic off
          </span>
        ) : status === "offline" ? (
          <span className="rounded-pill bg-surface-container-high px-2 py-0.5 text-[11px] font-semibold text-on-surface-variant">
            Not connected
          </span>
        ) : (
          <span className="rounded-pill bg-surface-container-high px-2 py-0.5 text-[11px] font-semibold text-on-surface-variant">
            Listening
          </span>
        )}
      </div>
    </div>
  );
}

/** Your own tile: speaking comes from metering the local mic. */
function SelfTile({
  name,
  owner,
  stream,
  micOn,
}: {
  name: string;
  owner: boolean;
  stream: MediaStream | null;
  micOn: boolean;
}) {
  const { level, speaking } = useAudioLevel(stream);
  return (
    <Tile
      name={name}
      you
      owner={owner}
      speaking={micOn && speaking}
      level={level}
      status={micOn ? "listening" : "mic-off"}
    />
  );
}

/**
 * A peer's tile: metered from their audio stream when P2P voice is flowing;
 * otherwise "speaking" lights up for a few seconds after each transcript line.
 */
function PeerTile({
  name,
  owner,
  online,
  stream,
  recentlySpoke,
}: {
  name: string;
  owner: boolean;
  online: boolean;
  stream: MediaStream | null;
  recentlySpoke: boolean;
}) {
  const { level, speaking } = useAudioLevel(stream);
  const talking = stream ? speaking : recentlySpoke;
  return (
    <Tile
      name={name}
      owner={owner}
      online={online}
      speaking={talking}
      level={stream ? level : undefined}
      status={online ? "listening" : "offline"}
    />
  );
}

function RemoteAudio({ stream }: { stream: MediaStream }) {
  const ref = useRef<HTMLAudioElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.srcObject = stream;
  }, [stream]);
  return <audio ref={ref} autoPlay className="hidden" />;
}

/* ------------------------------- Host banner ----------------------------- */

/**
 * What the AI host said, in the landing's gradient banner: its exact line, the
 * topic the room is on now, and why and when it stepped in. Earlier lines fold
 * out below.
 */
function HostBanner({
  live,
  topic,
  openingTopic,
  openingPickedByHost,
  latest,
  history,
  speaking,
  muted,
}: {
  live: boolean;
  topic: string;
  openingTopic: string;
  openingPickedByHost: boolean;
  latest: HostMessage | undefined;
  history: HostMessage[];
  speaking: boolean;
  muted: boolean;
}) {
  const [showEarlier, setShowEarlier] = useState(false);
  const earlier = history.filter((m) => m.id !== latest?.id);

  return (
    <section
      aria-label="AI host"
      className={cn(
        "mx-auto w-full max-w-4xl shrink-0 rounded-2xl border-2 border-ink bg-gradient-to-r from-amber-200 via-lime to-lime-light p-3.5 transition-all duration-200",
        speaking ? "-translate-y-0.5 shadow-pop" : "shadow-pop-sm",
      )}
    >
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ink-fixed text-lime">
          <GraduationCap className="h-5 w-5" />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-pill bg-white px-2 py-px font-label text-[10px] font-bold uppercase tracking-wider text-purple">
              {latest ? "AI host · New topic" : "AI host · Opening topic"}
            </span>
            <span className="text-[11px] font-bold text-ink-fixed/70">
              {speaking
                ? "Speaking…"
                : latest
                  ? `${TRIGGER[latest.trigger]} · ${clock(latest.at)}`
                  : live
                    ? "Listening"
                    : "Starts listening when the room starts"}
            </span>
            {muted && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-ink-fixed/70" title="Host voice muted">
                <VolumeX className="h-3.5 w-3.5" /> muted
              </span>
            )}
          </div>

          {latest ? (
            <p key={latest.id} className="mt-1.5 font-display text-base font-bold leading-snug text-ink-fixed motion-safe:animate-topic-in sm:text-lg">
              “{latest.message}”
            </p>
          ) : (
            <p className="mt-1.5 text-sm font-medium text-ink-fixed/80">
              {live
                ? "Talk it through. I'll jump in with a new topic when it's time."
                : "When the room starts, I'll listen in and change the topic when it's time."}
            </p>
          )}

          {/* The topic is the point of the host: it gets the sticker treatment. */}
          <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-fixed/75">
            <span>{latest ? "Now talking about" : "Opening topic"}</span>
            <span
              key={topic}
              className="max-w-full truncate rounded bg-white px-1.5 py-0.5 font-display text-sm font-extrabold text-ink-fixed underline decoration-coral decoration-2 underline-offset-2 motion-safe:animate-topic-in"
            >
              {topic}
            </span>
            {openingPickedByHost && topic === openingTopic && (
              <span className="inline-flex items-center gap-1 font-semibold">
                <Sparkles className="h-3 w-3 text-purple" /> picked by the host
              </span>
            )}
            {latest?.reason && <span className="min-w-0">· {latest.reason}</span>}
          </p>

          {earlier.length > 0 && (
            <button
              onClick={() => setShowEarlier((v) => !v)}
              className="mt-2 text-xs font-bold text-purple hover:underline"
            >
              {showEarlier ? "Hide earlier topics" : `Earlier topics (${earlier.length})`}
            </button>
          )}
          {showEarlier && earlier.length > 0 && (
            <ul className="thin-scroll mt-2 max-h-40 space-y-2 overflow-y-auto rounded-xl bg-white/70 p-2.5">
              {earlier.map((m) => (
                <li key={m.id}>
                  <p className="text-sm text-ink-fixed">“{m.message}”</p>
                  <p className="text-xs text-ink-fixed/70">
                    {m.topic} · {TRIGGER[m.trigger]} · {clock(m.at)} · {m.reason}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------- Controls -------------------------------- */

function CtrlButton({
  onClick,
  active,
  off,
  disabled,
  title,
  children,
}: {
  onClick?: () => void;
  /** On, e.g. the mic is live (lime). */
  active?: boolean;
  /** Off, e.g. mic or host voice muted (coral). */
  off?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      aria-pressed={active ? true : off ? false : undefined}
      className={cn(
        "grid h-12 w-12 place-items-center rounded-full border-2 transition-colors disabled:opacity-40",
        active
          ? "border-ink bg-lime text-ink-fixed hover:bg-lime-light"
          : off
            ? "border-secondary/40 bg-coral/15 text-secondary hover:border-secondary"
            : "border-ink/15 bg-card text-ink hover:border-ink",
      )}
    >
      {children}
    </button>
  );
}

/** Time left until `scheduledEndAt`, as the landing card's clock pill; coral in the last minute. */
function Countdown({ ms }: { ms: number }) {
  return (
    <span
      title="Time left in this session"
      className={cn(
        "inline-flex h-9 items-center gap-1 rounded-pill border px-2.5 font-label text-xs font-bold tabular-nums",
        ms <= 60_000 ? "border-secondary/40 bg-coral/15 text-secondary" : "border-ink/10 bg-card text-on-surface-variant",
      )}
    >
      <Timer className="h-3.5 w-3.5" />
      {ms === 0 ? "Ending…" : formatCountdown(ms)}
    </span>
  );
}

/* --------------------------------- Report -------------------------------- */

function ReportView({
  roomId,
  topic,
  report,
}: {
  roomId: string;
  topic: string;
  report: RoomReport | null | undefined;
}) {
  return (
    <div className="min-h-screen bg-surface">
      <header className="flex h-14 items-center justify-between border-b border-ink/10 bg-cream/90 px-4 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <Logo className="h-7 w-7" />
          <span className="font-display text-sm font-bold text-ink">Session report</span>
        </div>
        <Link
          href="/practice"
          className="inline-flex h-9 items-center gap-1.5 rounded-pill border-2 border-ink bg-ink px-4 font-display text-sm font-bold text-cream shadow-pop-sm transition-all hover:translate-x-px hover:translate-y-px hover:shadow-none"
        >
          Back to rooms
        </Link>
      </header>

      <div className="mx-auto max-w-3xl px-6 py-10">
        <p className="text-label-caps font-label-caps uppercase text-on-surface-variant">
          Room · {topic}
        </p>
        <h1 className="mt-2 font-display text-4xl font-extrabold tracking-tight text-ink">
          How the session{" "}
          <span className="inline-block -rotate-1 rounded-xl border-2 border-ink bg-lime px-2 shadow-pop-sm text-ink-fixed">went.</span>
        </h1>

        {!report ? (
          <p className="mt-6 rounded-2xl border-2 border-ink bg-card p-6 text-on-surface-variant shadow-pop">
            The session ended, but no report was generated (the AI may have been unavailable). Room
            id: <code className="rounded bg-surface-container px-1">{roomId}</code>
          </p>
        ) : (
          <div className="mt-6 space-y-6">
            <div className="rounded-3xl border-2 border-ink bg-ink-fixed p-6 text-white shadow-pop-lg">
              <p className="font-label text-sm font-bold uppercase tracking-wider text-lime">Summary</p>
              <p className="mt-2 text-lg leading-relaxed">{report.summary}</p>
            </div>

            <ReportList
              icon={<CheckCircle2 className="h-5 w-5 text-purple-fg" />}
              title="Highlights"
              items={report.highlights}
              tone="purple"
            />
            <ReportList
              icon={<Lightbulb className="h-5 w-5 text-tertiary" />}
              title="Suggestions for next time"
              items={report.suggestions}
              tone="lime"
            />

            {report.topicsExplored.length > 0 && (
              <div>
                <h2 className="mb-3 font-display text-lg font-bold text-ink">Topics you explored</h2>
                <div className="flex flex-wrap gap-2">
                  {report.topicsExplored.map((t) => (
                    <span
                      key={t}
                      className="rounded-pill border-2 border-ink bg-card px-3 py-1.5 font-display text-sm font-bold text-ink shadow-pop-sm"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <RoomQuestSummary roomId={roomId} />
      </div>
    </div>
  );
}

function ReportList({
  icon,
  title,
  items,
  tone,
}: {
  icon: React.ReactNode;
  title: string;
  items: string[];
  tone: "purple" | "lime";
}) {
  if (items.length === 0) return null;
  return (
    <div>
      <h2 className="mb-3 font-display text-lg font-bold text-ink">{title}</h2>
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li
            key={i}
            className={cn(
              "flex items-start gap-3 rounded-2xl border-2 p-4",
              tone === "purple" ? "border-purple/30 bg-purple-light/50" : "border-lime-dim bg-lime/20",
            )}
          >
            <span className="mt-0.5 shrink-0">{icon}</span>
            <span className="text-on-surface">{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
