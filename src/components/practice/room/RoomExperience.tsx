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
  Users,
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

const HOST_NAME = "AI Host";

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
    <div className="flex h-screen flex-col bg-stage text-white">
      {/* Stage */}
      <main className="relative flex min-h-0 flex-1 flex-col gap-3 p-3 sm:p-4">
        {/* The host is not a participant: it sits above the room, listening, and
            speaks up through this bar when it changes the topic. */}
        <HostBar
          live={live}
          topic={topic}
          openingTopic={room.topic}
          openingPickedByHost={room.topicPickedByHost === true}
          latest={rt.latestHostMessage}
          history={hostHistory}
          speaking={hostVoice.speaking}
          muted={hostMuted}
        />

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div
            className={cn(
              "mx-auto grid h-full max-w-6xl auto-rows-fr place-content-center gap-3",
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
          <p className="absolute bottom-4 left-1/2 z-10 -translate-x-1/2 rounded-full bg-secondary px-4 py-2 text-sm">
            Couldn&apos;t start: {start.error.message}
          </p>
        ) : rt.error ? (
          <p className="absolute bottom-4 left-1/2 z-10 -translate-x-1/2 rounded-full bg-secondary px-4 py-2 text-sm">
            {rt.error}
          </p>
        ) : isParticipant && !rt.connected ? (
          <p className="absolute bottom-4 left-1/2 z-10 -translate-x-1/2 rounded-full bg-stage-tile px-4 py-2 text-sm text-white/80">
            Connecting to the room…
          </p>
        ) : null}
      </main>

      {/* Bottom bar */}
      <footer className="grid h-20 shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-2 px-4">
        <div className="flex min-w-0 items-center gap-3">
          <Logo className="hidden h-6 w-6 sm:block" />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">
              {live && remaining !== null ? <Countdown ms={remaining} /> : <Clock />}
              <span className="mx-2 text-white/40">|</span>
              {live ? "Live" : "Waiting to start"}
            </p>
            <p className="truncate text-xs text-white/50">
              {room.durationMinutes != null && <>{room.durationMinutes} min session</>}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
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
              onClick={() =>
                changeTopic.mutate(undefined, { onSuccess: (m) => rt.addHostMessage(m) })
              }
            >
              {changeTopic.isPending ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Shuffle className="h-5 w-5" />
              )}
            </CtrlButton>
          )}

          {isOwner && !live && (
            <button
              onClick={() => start.mutate()}
              disabled={start.isPending}
              className="inline-flex h-12 items-center gap-2 rounded-full bg-lime px-5 font-medium text-ink hover:bg-lime-light disabled:opacity-60"
            >
              <Play className="h-5 w-5" /> {start.isPending ? "Starting…" : "Start"}
            </button>
          )}

          {isOwner && live ? (
            <button
              onClick={() => end.mutate()}
              disabled={end.isPending}
              title="End for everyone"
              className="inline-flex h-12 items-center gap-2 rounded-full bg-secondary px-5 font-medium text-white hover:bg-secondary-container disabled:opacity-60"
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
              className="grid h-12 w-16 place-items-center rounded-full bg-secondary text-white transition-colors hover:bg-secondary-container disabled:opacity-60"
            >
              {leave.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <PhoneOff className="h-5 w-5" />}
            </button>
          )}
        </div>

        <div className="flex items-center justify-end gap-1">
          {isOwner && (
            <button
              onClick={() => setInvitesOpen((v) => !v)}
              aria-expanded={invitesOpen}
              title={room.status === "waiting" ? "Who can join" : "Guest list (locked once the room starts)"}
              className={cn(
                "inline-flex h-10 items-center gap-1.5 rounded-full px-3 text-sm transition-colors",
                invitesOpen ? "bg-lime text-ink" : "text-white/80 hover:bg-stage-hover",
              )}
            >
              <UserPlus className="h-5 w-5" />
              <span className="hidden sm:inline">{room.status === "waiting" ? "Invite" : "Guests"}</span>
              {!!room.invitedEmails?.length && <span className="opacity-70">{room.invitedEmails.length}</span>}
            </button>
          )}
          <span
            title={`${room.participantIds.length} of ${room.maxParticipants} people`}
            className="inline-flex h-10 items-center gap-1.5 rounded-full px-3 text-sm text-white/80"
          >
            <Users className="h-5 w-5" />
            {room.participantIds.length}/{room.maxParticipants}
          </span>
        </div>
      </footer>

      {/* Hidden remote audio (P2P mesh, when signaling is live) */}
      {voice.remoteStreams.map((r) => (
        <RemoteAudio key={r.uid} stream={r.stream} />
      ))}
    </div>
  );
}

/* --------------------------------- Tiles --------------------------------- */

/** Meet-style column count: keep tiles roughly 16:9 as the room fills. */
function gridColsClass(n: number): string {
  if (n <= 1) return "grid-cols-1";
  if (n <= 2) return "grid-cols-1 sm:grid-cols-2";
  if (n <= 4) return "grid-cols-2";
  if (n <= 6) return "grid-cols-2 md:grid-cols-3";
  return "grid-cols-3 md:grid-cols-4";
}

function Tile({
  name,
  owner,
  online = true,
  speaking,
  level,
  status,
}: {
  name: string;
  owner?: boolean;
  online?: boolean;
  speaking: boolean;
  level?: number;
  /** Small corner badge when not speaking. */
  status?: "mic-off";
}) {
  return (
    <div
      className={cn(
        "relative flex min-h-[9rem] items-center justify-center overflow-hidden rounded-xl bg-stage-tile transition-shadow duration-150",
        speaking ? "shadow-[inset_0_0_0_3px_#d2e823]" : "shadow-none",
        !online && "opacity-50",
      )}
    >
      <ParticipantAvatar
        name={name}
        size={96}
        className={cn("transition-transform duration-150", speaking && "scale-105")}
      />

      <div className="absolute bottom-2.5 left-3 flex items-center gap-1.5 text-sm font-medium [text-shadow:0_1px_2px_rgba(0,0,0,0.7)]">
        <span className="max-w-[12rem] truncate">{name}</span>
        {owner && <Crown className="h-3.5 w-3.5 text-lime" />}
      </div>

      <div className="absolute right-2.5 top-2.5">
        {speaking ? (
          <VoiceBars level={level} />
        ) : status === "mic-off" ? (
          <span className="grid h-7 w-7 place-items-center rounded-full bg-secondary/90" title="Microphone off">
            <MicOff className="h-3.5 w-3.5" />
          </span>
        ) : null}
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
      name={`${name} (You)`}
      owner={owner}
      speaking={micOn && speaking}
      level={level}
      status={micOn ? undefined : "mic-off"}
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

/* -------------------------------- Host bar ------------------------------- */

/**
 * The AI host is not a participant, so it doesn't get a tile. It lives in a
 * slim bar above the room: who it is and what it's doing, the current topic,
 * and its latest line with every detail (verbatim message, topic, why it
 * stepped in, what triggered it, when). Earlier lines fold out below.
 */
function HostBar({
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
  const status = speaking ? "speaking" : live ? "listening" : "waiting to start";

  return (
    <section
      aria-label="AI host"
      className={cn(
        "mx-auto w-full max-w-3xl shrink-0 rounded-2xl bg-stage-raised px-4 py-3 transition-shadow duration-200",
        speaking && "shadow-[0_0_0_2px_#d2e823]",
      )}
    >
      <div className="flex items-start gap-3">
        <ParticipantAvatar name={HOST_NAME} isAI size={40} speaking={speaking} className="ring-offset-stage-raised" />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-white/60">
            <span className="inline-flex items-center gap-1 font-medium text-white">
              <Sparkles className="h-3.5 w-3.5 text-lime" /> {HOST_NAME}
            </span>
            <span>· {status}</span>
            {speaking && <VoiceBars size={16} />}
            {muted && (
              <span className="inline-flex items-center gap-1" title="Host voice muted">
                <VolumeX className="h-3.5 w-3.5" /> muted
              </span>
            )}
          </div>

          {/* The topic is the point of the host — make it the hero, and flash it on change. */}
          <div className="mt-2">
            <p className="text-[11px] font-medium uppercase tracking-wide text-white/50">
              {latest ? "Now talking about" : "Opening topic"}
            </p>
            <p key={topic} className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="animate-topic-highlight -mx-1.5 inline-block max-w-full truncate rounded-lg px-1.5 py-0.5 text-xl font-semibold leading-tight text-white">
                {topic}
              </span>
              {openingPickedByHost && topic === openingTopic && (
                <span className="inline-flex items-center gap-1 rounded-full bg-lime/15 px-2 py-0.5 text-[11px] font-medium text-lime">
                  <Sparkles className="h-3 w-3" /> picked by the host
                </span>
              )}
              {latest && topic !== openingTopic && (
                <span className="text-xs text-white/40" title={`Started on “${openingTopic}”`}>
                  · started on “{openingTopic}”
                </span>
              )}
            </p>
          </div>

          {/* Details — only a host message carries them (the opening topic has none). */}
          {latest ? (
            <div key={latest.id} className="animate-fade-up mt-2 border-l-2 border-lime/60 pl-3">
              <p className="text-sm leading-snug text-white/90">“{latest.message}”</p>
              <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-white/60">
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-white/80">{TRIGGER[latest.trigger]}</span>
                <span>{clock(latest.at)}</span>
                <span className="text-white/40">·</span>
                <span className="min-w-0">{latest.reason}</span>
              </p>
            </div>
          ) : (
            <p className="mt-2 text-sm text-white/60">
              {live
                ? "Listening to the conversation — I'll jump in with a new topic when it's time."
                : "I'll start listening when the room starts."}
            </p>
          )}

          {earlier.length > 0 && (
            <button
              onClick={() => setShowEarlier((v) => !v)}
              className="mt-2 text-xs font-medium text-lime hover:underline"
            >
              {showEarlier ? "Hide earlier topics" : `Earlier topics (${earlier.length})`}
            </button>
          )}
          {showEarlier && earlier.length > 0 && (
            <ul className="thin-scroll mt-2 max-h-40 space-y-2 overflow-y-auto border-t border-white/10 pt-2">
              {earlier.map((m) => (
                <li key={m.id}>
                  <p className="text-sm text-white/90">“{m.message}”</p>
                  <p className="text-xs text-white/50">
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
  /** Highlighted (Meet blue), e.g. a panel that is open. */
  active?: boolean;
  /** Turned off (Meet red), e.g. mic off. */
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
      className={cn(
        "grid h-12 w-12 place-items-center rounded-full transition-colors disabled:opacity-40",
        off
          ? "bg-secondary text-white hover:bg-secondary-container"
          : active
            ? "bg-lime text-ink hover:bg-lime-light"
            : "bg-stage-tile text-white hover:bg-stage-hover",
      )}
    >
      {children}
    </button>
  );
}

/** Time left until `scheduledEndAt`; turns red in the last minute. */
function Countdown({ ms }: { ms: number }) {
  return (
    <span
      title="Time left in this session"
      className={cn("inline-flex items-center gap-1.5 tabular-nums", ms <= 60_000 && "text-coral")}
    >
      <Timer className="h-4 w-4" />
      {ms === 0 ? "Ending…" : `${formatCountdown(ms)} left`}
    </span>
  );
}

function Clock() {
  const [now, setNow] = useState<string>("");
  useEffect(() => {
    const tick = () => setNow(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    tick();
    const id = setInterval(tick, 15_000);
    return () => clearInterval(id);
  }, []);
  return <span>{now}</span>;
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
          <span className="inline-block -rotate-1 rounded-xl border-2 border-ink bg-lime px-2 shadow-pop-sm">went.</span>
        </h1>

        {!report ? (
          <p className="mt-6 rounded-2xl border-2 border-ink bg-white p-6 text-on-surface-variant shadow-pop">
            The session ended, but no report was generated (the AI may have been unavailable). Room
            id: <code className="rounded bg-surface-container px-1">{roomId}</code>
          </p>
        ) : (
          <div className="mt-6 space-y-6">
            <div className="rounded-3xl border-2 border-ink bg-ink p-6 text-cream shadow-pop-lg">
              <p className="font-label text-sm font-bold uppercase tracking-wider text-lime">Summary</p>
              <p className="mt-2 text-lg leading-relaxed">{report.summary}</p>
            </div>

            <ReportList
              icon={<CheckCircle2 className="h-5 w-5 text-purple" />}
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
                      className="rounded-pill border-2 border-ink bg-white px-3 py-1.5 font-display text-sm font-bold text-ink shadow-pop-sm"
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
