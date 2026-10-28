"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Mic,
  MicOff,
  Sparkles,
  PhoneOff,
  Play,
  Radio,
  Crown,
  Lightbulb,
  CheckCircle2,
  Loader2,
  VideoOff,
  UserPlus,
} from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { ApiError } from "@/lib/apiClient";
import { useMe, useRoom, useRoomLifecycle } from "@/lib/queries";
import { useRoomSocket } from "@/lib/useRoomSocket";
import { useSpeechRecognition } from "@/lib/useSpeechRecognition";
import { useVoiceMesh } from "@/lib/useVoiceMesh";
import { Logo } from "@/components/brand/Logo";
import { ParticipantAvatar } from "@/components/practice/ParticipantAvatar";
import { LoadingScreen } from "@/components/app/LoadingScreen";
import { AiHostPanel } from "./AiHostPanel";
import { InvitePanel } from "./InvitePanel";
import { RoomAccessScreen } from "./RoomAccessScreen";
import { cn } from "@/lib/cn";
import type { RoomReport, TopicSuggestion } from "@/lib/types";

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
  const { join, leave, start, end, suggest } = useRoomLifecycle(roomId);
  const roomErrorStatus = roomError instanceof ApiError ? roomError.status : undefined;
  const isParticipant = !!user && !!room?.participantIds.includes(user.uid);
  const rt = useRoomSocket(roomId, isParticipant);

  const [extra, setExtra] = useState<TopicSuggestion[]>([]);
  const [invitesOpen, setInvitesOpen] = useState(false);
  // The AI host panel opens only on demand; a new topic while it's closed shows
  // as a dot on its button (unread = newer than the last one the user saw).
  const [aiOpen, setAiOpen] = useState(false);
  const [seenTopicId, setSeenTopicId] = useState<string | undefined>(undefined);
  // Speech-to-text isn't shown to anyone; it only feeds the AI host.
  const stt = useSpeechRecognition(rt.sendTranscript);
  const voice = useVoiceMesh({
    socket: rt.socket,
    roomId,
    enabled: room?.status === "live" && isParticipant && !rt.removed,
    selfUid: user?.uid,
  });

  // Revoked mid-session: stop listening right away (the server already ignores us).
  useEffect(() => {
    if (rt.removed) stt.stop();
  }, [rt.removed, stt]);

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

  const suggestions = useMemo(() => {
    const byId = new Map<string, TopicSuggestion>();
    [...rt.suggestions, ...extra].forEach((s) => byId.set(s.id, s));
    return [...byId.values()].sort((a, b) => b.at.localeCompare(a.at));
  }, [rt.suggestions, extra]);

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
  const live = room.status === "live";

  return (
    <div className="flex h-screen flex-col bg-[#202124] text-white">
      {/* Top bar */}
      <header className="flex h-14 shrink-0 items-center justify-between px-4">
        <div className="flex min-w-0 items-center gap-3">
          <Logo className="h-7 w-7" />
          <div className="min-w-0">
            <p className="truncate text-sm font-bold leading-tight">{room.topic}</p>
            <p className="text-[11px] leading-tight text-white/50">{room.facilitatorPersona}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {live ? (
            <span className="inline-flex items-center gap-1.5 rounded-pill bg-secondary/20 px-2.5 py-1 text-xs font-bold text-secondary-fixed-dim">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-secondary-fixed-dim" /> Live
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-pill bg-white/10 px-2.5 py-1 text-xs font-bold text-white/70">
              Waiting to start
            </span>
          )}
          <ConnectionIndicator connection={rt.connection} onReconnect={rt.reconnect} />
          <VoiceIndicator voice={voice} live={live} />
          {isOwner && (
            <button
              onClick={() => {
                setInvitesOpen((v) => !v);
                setAiOpen(false);
              }}
              aria-expanded={invitesOpen}
              className="inline-flex items-center gap-1.5 rounded-pill bg-white/10 px-3 py-1 text-xs font-semibold text-white transition-colors hover:bg-white/20"
            >
              <UserPlus className="h-3.5 w-3.5" /> Invite
              {!!room.invitedEmails?.length && (
                <span className="text-white/60">{room.invitedEmails.length}</span>
              )}
            </button>
          )}
        </div>
      </header>

      {/* Stage — participant tiles with the AI host pinned in the center */}
      <main className="relative min-h-0 flex-1">
        <ParticipantGrid
          room={room}
          presence={rt.presence}
          selfUid={user?.uid}
          selfName={selfName}
          selfSpeaking={stt.listening}
          selfMuted={voice.muted}
          panelOpen={aiOpen}
        />

        <AiHostPanel
          open={aiOpen}
          onClose={() => {
            setSeenTopicId(suggestions[0]?.id);
            setAiOpen(false);
          }}
          seedTopic={room.topic}
          persona={room.facilitatorPersona}
          live={live}
          suggestions={suggestions}
          // Only the host may ask; the API broadcasts the result to everyone, and
          // the requester also adds it right away in case its socket is down.
          onSuggest={
            isOwner
              ? () => suggest.mutate(undefined, { onSuccess: (s) => setExtra((p) => [...p, s]) })
              : undefined
          }
          suggesting={suggest.isPending}
          suggestError={suggest.isError ? "Couldn't get a topic. Try again in a moment." : undefined}
        />

        {isOwner && invitesOpen && (
          <InvitePanel room={room} onClose={() => setInvitesOpen(false)} />
        )}
      </main>

      {/* Bottom control bar (Meet-style) */}
      <ControlBar
        live={live}
        isOwner={isOwner}
        stt={stt}
        voice={voice}
        connected={rt.connected}
        onStart={() => start.mutate()}
        starting={start.isPending}
        onEnd={() => end.mutate()}
        ending={end.isPending}
        // Give the seat back (rooms cap at 5), then go — even if the call fails.
        onLeave={() => leave.mutate(undefined, { onSettled: () => router.push("/practice") })}
        leaving={leave.isPending}
        aiOpen={aiOpen}
        aiUnread={!aiOpen && !!suggestions[0] && suggestions[0].id !== seenTopicId}
        onToggleAi={() => {
          setSeenTopicId(suggestions[0]?.id);
          setAiOpen((v) => !v);
          setInvitesOpen(false);
        }}
      />

      {/* Hidden remote audio (P2P mesh, when signaling is live) */}
      {voice.remoteStreams.map((r) => (
        <RemoteAudio key={r.uid} stream={r.stream} />
      ))}
    </div>
  );
}

/* --------------------------- Participant grid ---------------------------- */

/** Meet-style column count: keep tiles roughly square as the room fills. */
function gridColsClass(n: number): string {
  if (n <= 1) return "grid-cols-1";
  if (n <= 4) return "grid-cols-2";
  if (n <= 9) return "grid-cols-3";
  return "grid-cols-4";
}

function ParticipantGrid({
  room,
  presence,
  selfUid,
  selfName,
  selfSpeaking,
  selfMuted,
  panelOpen,
}: {
  room: { participantIds: string[]; ownerId: string };
  presence: Record<string, string | undefined>;
  selfUid?: string;
  selfName: string;
  selfSpeaking: boolean;
  selfMuted: boolean;
  /** The AI host panel is docked on the right (desktop): keep tiles clear of it. */
  panelOpen: boolean;
}) {
  const ids = room.participantIds;
  return (
    <div className={cn("absolute inset-0 overflow-y-auto p-3 sm:p-5", panelOpen && "lg:pr-[23rem]")}>
      <div
        className={cn(
          "mx-auto grid h-full max-w-5xl auto-rows-fr place-content-center gap-3",
          gridColsClass(ids.length),
        )}
      >
        {ids.map((uid) => {
          const isSelf = uid === selfUid;
          const name = isSelf ? selfName : (presence[uid] ?? "Guest");
          // Membership, not the name: someone connected without a known name is still online.
          const online = isSelf || uid in presence;
          return (
            <ParticipantTile
              key={uid}
              name={isSelf ? `${name} (you)` : name}
              online={online}
              speaking={isSelf && selfSpeaking}
              muted={isSelf ? selfMuted : undefined}
              owner={uid === room.ownerId}
            />
          );
        })}
      </div>
    </div>
  );
}

function ParticipantTile({
  name,
  online,
  speaking,
  muted,
  owner,
}: {
  name: string;
  online: boolean;
  speaking: boolean;
  muted?: boolean;
  owner: boolean;
}) {
  return (
    <div
      className={cn(
        "relative flex min-h-[8rem] items-center justify-center overflow-hidden rounded-2xl bg-[#3c4043] ring-2 transition-all",
        speaking ? "ring-emerald-400" : "ring-transparent",
        !online && "opacity-60",
      )}
    >
      {/* Camera-off placeholder — a real <video> tile drops in here once video ships. */}
      <ParticipantAvatar name={name} size={84} speaking={speaking} />

      <div className="absolute bottom-2 left-2 flex items-center gap-1.5 rounded-lg bg-black/45 px-2 py-1 text-xs font-semibold backdrop-blur-sm">
        {muted !== undefined &&
          (muted ? (
            <MicOff className="h-3.5 w-3.5 text-secondary-fixed-dim" />
          ) : (
            <Mic className="h-3.5 w-3.5 text-white/80" />
          ))}
        <span className="max-w-[10rem] truncate">{name}</span>
        {owner && <Crown className="h-3.5 w-3.5 text-tertiary-fixed-dim" />}
      </div>
    </div>
  );
}

/* --------------------------------- Voice --------------------------------- */

function VoiceIndicator({
  voice,
  live,
}: {
  voice: ReturnType<typeof useVoiceMesh>;
  live: boolean;
}) {
  if (!live) return null;
  const label =
    voice.status === "connected"
      ? `Voice · ${voice.peerCount} peer${voice.peerCount === 1 ? "" : "s"}`
      : voice.status === "requesting-mic"
        ? "Requesting mic…"
        : voice.status === "mic-denied"
          ? "Mic blocked"
          : "Voice ready";
  return (
    <span className="hidden items-center gap-1.5 rounded-pill bg-white/10 px-2.5 py-1 text-xs font-medium text-white/70 sm:inline-flex">
      <Radio
        className={cn("h-3.5 w-3.5", voice.status === "connected" ? "text-emerald-400" : "text-white/60")}
      />
      {label}
    </span>
  );
}

/** Surfaces a lost realtime connection — otherwise the room just silently stops updating. */
function ConnectionIndicator({
  connection,
  onReconnect,
}: {
  connection: ReturnType<typeof useRoomSocket>["connection"];
  onReconnect: () => void;
}) {
  // The first connect normally takes well under a second; only a stuck one shows.
  const [slowStart, setSlowStart] = useState(false);
  useEffect(() => {
    if (connection !== "connecting") return;
    const timer = setTimeout(() => setSlowStart(true), 5000);
    return () => clearTimeout(timer);
  }, [connection]);

  if (connection === "reconnecting" || (connection === "connecting" && slowStart)) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-pill bg-amber-400/15 px-2.5 py-1 text-xs font-bold text-amber-300">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />{" "}
        {connection === "connecting" ? "Connecting…" : "Reconnecting…"}
      </span>
    );
  }
  if (connection === "failed") {
    return (
      <button
        onClick={onReconnect}
        className="inline-flex items-center gap-1.5 rounded-pill bg-red-500/20 px-2.5 py-1 text-xs font-bold text-red-300 hover:bg-red-500/30"
      >
        Disconnected · Reconnect
      </button>
    );
  }
  return null;
}

function RemoteAudio({ stream }: { stream: MediaStream }) {
  const ref = useRef<HTMLAudioElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.srcObject = stream;
  }, [stream]);
  return <audio ref={ref} autoPlay className="hidden" />;
}

/* ---------------------------- Control bar -------------------------------- */

function CtrlButton({
  onClick,
  active,
  danger,
  disabled,
  title,
  children,
}: {
  onClick?: () => void;
  active?: boolean;
  danger?: boolean;
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
        danger
          ? "bg-secondary text-on-secondary hover:bg-secondary-container"
          : active
            ? "bg-white text-[#202124] hover:bg-white/90"
            : "bg-white/10 text-white hover:bg-white/20",
      )}
    >
      {children}
    </button>
  );
}

function ControlBar({
  live,
  isOwner,
  stt,
  voice,
  connected,
  onStart,
  starting,
  onEnd,
  ending,
  onLeave,
  leaving,
  aiOpen,
  aiUnread,
  onToggleAi,
}: {
  live: boolean;
  isOwner: boolean;
  stt: ReturnType<typeof useSpeechRecognition>;
  voice: ReturnType<typeof useVoiceMesh>;
  connected: boolean;
  onStart: () => void;
  starting: boolean;
  onEnd: () => void;
  ending: boolean;
  onLeave: () => void;
  leaving: boolean;
  aiOpen: boolean;
  /** A topic arrived that the user hasn't opened the panel for yet. */
  aiUnread: boolean;
  onToggleAi: () => void;
}) {
  const micReady = voice.status === "ready" || voice.status === "connected";
  return (
    <footer className="flex h-20 shrink-0 items-center justify-center gap-2 px-4 sm:justify-between">
      {/* Left — spacer mirroring the right column so the call controls stay centered */}
      <div className="hidden w-40 sm:block" aria-hidden />

      {/* Center — call controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* AI host topics — on demand, never over the participants */}
        <div className="relative">
          <CtrlButton
            title={aiUnread ? "AI host — new topic" : "AI host topics"}
            active={aiOpen}
            onClick={onToggleAi}
          >
            <Sparkles className="h-5 w-5" />
          </CtrlButton>
          {aiUnread && (
            <span
              aria-hidden
              className="pointer-events-none absolute right-0.5 top-0.5 h-3 w-3 rounded-full bg-tertiary-fixed ring-2 ring-[#202124]"
            />
          )}
        </div>

        {/* Talk to the AI (browser speech-to-text) */}
        {stt.supported ? (
          <CtrlButton
            title={stt.listening ? "Pause talking" : "Talk — let the AI hear you"}
            active={stt.listening}
            disabled={!live || !connected}
            onClick={() => (stt.listening ? stt.stop() : stt.start())}
          >
            {stt.listening ? (
              <Mic className="h-5 w-5 animate-pulse" />
            ) : (
              <MicOff className="h-5 w-5" />
            )}
          </CtrlButton>
        ) : (
          <CtrlButton
            title="This browser has no speech-to-text, so the AI host can't hear you — use Chrome or Edge"
            disabled
          >
            <MicOff className="h-5 w-5" />
          </CtrlButton>
        )}

        {/* Voice mute (P2P mesh) — active once a mic is acquired */}
        <CtrlButton
          title={voice.muted ? "Unmute voice" : "Mute voice"}
          disabled={!micReady}
          active={micReady && !voice.muted}
          onClick={voice.toggleMute}
        >
          {voice.muted ? <MicOff className="h-5 w-5" /> : <Radio className="h-5 w-5" />}
        </CtrlButton>

        {/* Camera — placeholder for the future video call */}
        <CtrlButton title="Camera (coming soon)" disabled>
          <VideoOff className="h-5 w-5" />
        </CtrlButton>

        {isOwner && !live && (
          <button
            onClick={onStart}
            disabled={starting}
            className="inline-flex h-12 items-center gap-2 rounded-full bg-primary px-5 font-semibold text-on-primary hover:opacity-90 disabled:opacity-60"
          >
            <Play className="h-5 w-5" /> {starting ? "Starting…" : "Start"}
          </button>
        )}
        {isOwner && live && (
          <button
            onClick={onEnd}
            disabled={ending}
            className="inline-flex h-12 items-center gap-2 rounded-full bg-secondary px-5 font-semibold text-on-secondary hover:bg-secondary-container disabled:opacity-60"
          >
            <PhoneOff className="h-5 w-5" /> {ending ? "Ending…" : "End & report"}
          </button>
        )}

        {/* Leave — frees the seat; coming back re-joins automatically */}
        <button
          onClick={onLeave}
          disabled={leaving}
          title="Leave"
          aria-label="Leave"
          className="grid h-12 w-14 place-items-center rounded-full bg-secondary text-on-secondary transition-colors hover:bg-secondary-container disabled:opacity-60"
        >
          {leaving ? <Loader2 className="h-5 w-5 animate-spin" /> : <PhoneOff className="h-5 w-5" />}
        </button>
      </div>

      {/* Right — reserved to keep the center group centered */}
      <div className="hidden w-40 justify-end sm:flex">
        <button
          onClick={onLeave}
          disabled={leaving}
          className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-medium text-white/60 hover:text-white disabled:opacity-60"
        >
          <ArrowLeft className="h-4 w-4" /> Rooms
        </button>
      </div>
    </footer>
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
      <header className="flex h-14 items-center justify-between border-b border-outline-variant bg-white px-4">
        <div className="flex items-center gap-3">
          <Logo className="h-7 w-7" />
          <span className="text-sm font-bold text-on-surface">Session report</span>
        </div>
        <Link
          href="/practice"
          className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-semibold text-on-primary hover:opacity-90"
        >
          Back to rooms
        </Link>
      </header>

      <div className="mx-auto max-w-3xl px-6 py-10">
        <p className="text-label-caps font-label-caps uppercase text-on-surface-variant">
          Room · {topic}
        </p>
        <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-primary">
          How the session went
        </h1>

        {!report ? (
          <p className="mt-6 rounded-2xl border border-outline-variant bg-white p-6 text-on-surface-variant">
            The session ended, but no report was generated (the AI may have been unavailable). Room
            id: <code className="rounded bg-surface-container px-1">{roomId}</code>
          </p>
        ) : (
          <div className="mt-6 space-y-6">
            <div className="rounded-2xl bg-primary p-6 text-on-primary">
              <p className="text-sm font-bold uppercase tracking-wide text-tertiary-fixed">Summary</p>
              <p className="mt-2 text-lg leading-relaxed">{report.summary}</p>
            </div>

            <ReportList
              icon={<CheckCircle2 className="h-5 w-5 text-emerald-600" />}
              title="Highlights"
              items={report.highlights}
              tone="emerald"
            />
            <ReportList
              icon={<Lightbulb className="h-5 w-5 text-tertiary" />}
              title="Suggestions for next time"
              items={report.suggestions}
              tone="gold"
            />

            {report.topicsExplored.length > 0 && (
              <div>
                <h2 className="mb-3 text-lg font-bold text-on-surface">Topics you explored</h2>
                <div className="flex flex-wrap gap-2">
                  {report.topicsExplored.map((t) => (
                    <span
                      key={t}
                      className="rounded-pill border border-outline-variant bg-white px-3 py-1.5 text-sm font-medium text-on-surface-variant"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
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
  tone: "emerald" | "gold";
}) {
  if (items.length === 0) return null;
  return (
    <div>
      <h2 className="mb-3 text-lg font-bold text-on-surface">{title}</h2>
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li
            key={i}
            className={cn(
              "flex items-start gap-3 rounded-2xl border p-4",
              tone === "emerald"
                ? "border-emerald-200 bg-emerald-50/50"
                : "border-tertiary-fixed-dim/60 bg-tertiary-fixed/15",
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
