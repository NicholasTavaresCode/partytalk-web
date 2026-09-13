"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Mic,
  MicOff,
  Sparkles,
  Send,
  PhoneOff,
  Play,
  Crown,
  Lightbulb,
  CheckCircle2,
  MessageSquareText,
  Loader2,
  VideoOff,
  Captions,
  X,
  Shuffle,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useMe, useRoom, useRoomLifecycle } from "@/lib/queries";
import { useRoomSocket } from "@/lib/useRoomSocket";
import { useSpeechRecognition } from "@/lib/useSpeechRecognition";
import { useVoiceMesh } from "@/lib/useVoiceMesh";
import { useHostVoice } from "@/lib/hostVoice";
import { currentTopic, type HistoryItem } from "@/lib/roomHistory";
import { Logo } from "@/components/brand/Logo";
import { ParticipantAvatar } from "@/components/practice/ParticipantAvatar";
import { LoadingScreen } from "@/components/app/LoadingScreen";
import { cn } from "@/lib/cn";
import type { HostMessage, HostMessageTrigger, RoomReport, TranscriptSegment } from "@/lib/types";

const HOST_NAME = "AI Host";

const TRIGGER: Record<HostMessageTrigger, { label: string; cls: string }> = {
  volume: { label: "Topic covered", cls: "bg-primary-fixed text-on-primary-fixed" },
  silence: { label: "Room went quiet", cls: "bg-tertiary-fixed text-on-tertiary-fixed" },
  manual: { label: "On request", cls: "bg-secondary/15 text-secondary" },
};

const clock = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

export function RoomExperience({ roomId }: { roomId: string }) {
  const { user } = useAuth();
  const { data: me } = useMe();
  const { data: room, isLoading } = useRoom(roomId);
  const { join, start, end, changeTopic } = useRoomLifecycle(roomId);
  const rt = useRoomSocket(roomId);

  const [panelOpen, setPanelOpen] = useState(false);
  const [hostMuted, setHostMuted] = useState(false);
  const stt = useSpeechRecognition(rt.sendTranscript);
  const voice = useVoiceMesh({ socket: rt.socket, roomId, enabled: room?.status === "live" });
  const hostVoice = useHostVoice(rt.hostMessages, hostMuted);

  // Auto-join once (idempotent server-side; a 409 just means already joined).
  const joinedRef = useRef(false);
  useEffect(() => {
    if (!room || !user || joinedRef.current) return;
    if (!room.participantIds.includes(user.uid) && room.status !== "ended") {
      joinedRef.current = true;
      join.mutate();
    }
  }, [room, user, join]);

  // Newest first for the hub's history; `rt.hostMessages` is already deduped by id.
  const hostHistory = useMemo(
    () => [...rt.hostMessages].sort((a, b) => b.at.localeCompare(a.at)),
    [rt.hostMessages],
  );

  if (isLoading || !room) return <LoadingScreen label="Joining room…" />;

  const isOwner = room.ownerId === user?.uid;
  const report: RoomReport | null | undefined = room.report ?? (rt.ended ? rt.endedReport : undefined);
  const isEnded = room.status === "ended" || rt.ended;

  if (isEnded) return <ReportView roomId={roomId} topic={room.topic} report={report} />;

  const selfName = me?.displayName ?? user?.displayName ?? "You";
  const live = room.status === "live";
  // `room.topic` is only the opening topic; the host's latest line sets the current one.
  const topic = currentTopic(rt.hostMessages, room.topic);

  return (
    <div className="flex h-screen flex-col bg-[#202124] text-white">
      {/* Top bar — current topic front and centre */}
      <header className="flex h-14 shrink-0 items-center justify-between px-4">
        <div className="flex min-w-0 items-center gap-3">
          <Logo className="h-7 w-7" />
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase leading-tight tracking-[0.14em] text-tertiary-fixed/90">
              Current topic
            </p>
            <p key={topic} className="animate-fade-up truncate text-sm font-bold leading-tight">
              {topic}
            </p>
            <p className="truncate text-[11px] leading-tight text-white/50">
              {topic !== room.topic && <>Started on “{room.topic}” · </>}
              {room.participantIds.length}/{room.maxParticipants} · {room.status}
            </p>
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
        </div>
      </header>

      {/* Stage — participant windows (host included) split by the AI hub in the middle */}
      <main className="relative min-h-0 flex-1">
        <ParticipantGrid
          room={room}
          presence={rt.presence}
          selfUid={user?.uid}
          selfName={selfName}
          selfListening={stt.listening}
          live={live}
          hostSpeaking={hostVoice.speaking}
          hostMuted={hostMuted}
          panelOpen={panelOpen}
        />

        <AiHub
          live={live}
          latest={rt.latestHostMessage}
          history={hostHistory}
          onChangeTopic={() =>
            changeTopic.mutate(undefined, { onSuccess: (m) => rt.addHostMessage(m) })
          }
          changing={changeTopic.isPending}
          panelOpen={panelOpen}
        />

        <ConversationPanel
          open={panelOpen}
          onClose={() => setPanelOpen(false)}
          history={rt.history}
          selfUid={user?.uid}
          stt={stt}
          live={live}
          connected={rt.connected}
          onSend={rt.sendTranscript}
        />
      </main>

      {/* Bottom control bar (Meet-style) */}
      <ControlBar
        live={live}
        isOwner={isOwner}
        stt={stt}
        connected={rt.connected}
        panelOpen={panelOpen}
        onTogglePanel={() => setPanelOpen((v) => !v)}
        hostMuted={hostMuted}
        hostVoiceSupported={hostVoice.supported}
        onToggleHostMute={() => setHostMuted((v) => !v)}
        onStart={() => start.mutate()}
        starting={start.isPending}
        onEnd={() => end.mutate()}
        ending={end.isPending}
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
  selfListening,
  live,
  hostSpeaking,
  hostMuted,
  panelOpen,
}: {
  room: { participantIds: string[]; ownerId: string };
  presence: Record<string, string | undefined>;
  selfUid?: string;
  selfName: string;
  selfListening: boolean;
  live: boolean;
  hostSpeaking: boolean;
  hostMuted: boolean;
  panelOpen: boolean;
}) {
  const ids = room.participantIds;
  return (
    <div
      className={cn(
        "absolute inset-0 overflow-y-auto p-3 transition-[padding] duration-300 sm:p-5",
        panelOpen && "lg:pr-[22rem]",
      )}
    >
      <div
        className={cn(
          "mx-auto grid h-full max-w-5xl auto-rows-fr place-content-center gap-4",
          gridColsClass(ids.length + 1),
        )}
      >
        {/* The host is a permanent member: always in the room, always listening. */}
        <HostTile live={live} speaking={hostSpeaking} muted={hostMuted} />
        {ids.map((uid) => {
          const isSelf = uid === selfUid;
          const name = isSelf ? selfName : (presence[uid] ?? "Guest");
          const online = isSelf || presence[uid] !== undefined;
          return (
            <ParticipantTile
              key={uid}
              name={isSelf ? `${name} (you)` : name}
              online={online}
              speaking={isSelf && selfListening}
              micOn={isSelf ? selfListening : undefined}
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
  micOn,
  owner,
}: {
  name: string;
  online: boolean;
  speaking: boolean;
  micOn?: boolean;
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
        {micOn !== undefined &&
          (micOn ? (
            <Mic className="h-3.5 w-3.5 text-emerald-400" />
          ) : (
            <MicOff className="h-3.5 w-3.5 text-white/60" />
          ))}
        <span className="max-w-[10rem] truncate">{name}</span>
        {owner && <Crown className="h-3.5 w-3.5 text-tertiary-fixed-dim" />}
      </div>
    </div>
  );
}

function HostTile({ live, speaking, muted }: { live: boolean; speaking: boolean; muted: boolean }) {
  const status = speaking ? "speaking" : live ? "listening" : "waiting";
  return (
    <div
      className={cn(
        "relative flex min-h-[8rem] items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-[#1b2b4b] to-[#2f3340] ring-2 transition-all",
        speaking ? "ring-tertiary-fixed" : "ring-transparent",
      )}
      aria-label={`${HOST_NAME}, ${status}`}
    >
      <ParticipantAvatar name={HOST_NAME} isAI size={84} speaking={speaking} />

      <div className="absolute bottom-2 left-2 flex items-center gap-1.5 rounded-lg bg-black/45 px-2 py-1 text-xs font-semibold backdrop-blur-sm">
        <Sparkles className="h-3.5 w-3.5 text-tertiary-fixed" />
        <span>{HOST_NAME}</span>
        <span className="text-white/60">· {status}</span>
        {muted && <VolumeX className="h-3.5 w-3.5 text-white/60" aria-label="Host voice muted" />}
      </div>
    </div>
  );
}

/* --------------- AI host hub — the circle that splits the room ------------ */

/**
 * The AI host, rendered as a circle in the dead-centre of the stage so it
 * visually separates the participant windows. It listens to the room over the
 * socket and speaks up here whenever it changes the topic — each new line
 * animates in (keyed by id) like the host talking. It is an announcement, not a
 * suggestion: there is nothing to accept or reject.
 */
function AiHub({
  live,
  latest,
  history,
  onChangeTopic,
  changing,
  panelOpen,
}: {
  live: boolean;
  latest?: HostMessage;
  history: HostMessage[];
  onChangeTopic: () => void;
  changing: boolean;
  panelOpen: boolean;
}) {
  const [showHistory, setShowHistory] = useState(false);
  const earlier = history.filter((m) => m.id !== latest?.id);

  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 flex items-center justify-center p-4 transition-[padding] duration-300",
        panelOpen && "lg:pr-[22rem]",
      )}
    >
      <div className="pointer-events-auto flex w-full max-w-sm flex-col items-center gap-3">
        {/* The circle — a ring in the stage colour makes it read as a divider. */}
        <div className="relative grid place-items-center">
          {live && (
            <>
              <span className="absolute h-24 w-24 animate-ping rounded-full bg-tertiary-fixed/20 [animation-duration:2.4s]" />
              <span className="absolute h-24 w-24 animate-ping rounded-full bg-primary-fixed/20 [animation-duration:3.2s]" />
            </>
          )}
          <div className="relative grid h-24 w-24 place-items-center rounded-full bg-gradient-to-br from-primary-container to-primary text-tertiary-fixed shadow-[0_12px_40px_-8px_rgba(0,0,0,0.7)] ring-8 ring-[#202124]">
            <Sparkles className="h-9 w-9" />
          </div>
        </div>

        <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-tertiary-fixed/90">
          {HOST_NAME}
        </span>

        {/* What the host just said — verbatim; re-animates on each new line. */}
        {latest ? (
          <div
            key={latest.id}
            className="animate-fade-up w-full rounded-2xl bg-white px-4 py-3 text-center text-on-surface shadow-[0_22px_55px_-18px_rgba(0,0,0,0.7)]"
          >
            <div className="flex items-center justify-center gap-2">
              <span
                className={cn(
                  "rounded-pill px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                  TRIGGER[latest.trigger].cls,
                )}
              >
                {TRIGGER[latest.trigger].label}
              </span>
              <span className="text-[11px] text-on-surface-variant">{clock(latest.at)}</span>
            </div>
            <p className="mt-1.5 font-display text-lg font-extrabold leading-snug text-primary">
              “{latest.message}”
            </p>
            <p className="mt-1.5 text-xs text-on-surface-variant">
              <span className="font-bold uppercase tracking-wide">Now talking about</span>{" "}
              <span className="font-semibold text-on-surface">{latest.topic}</span>
            </p>
            <p className="mt-1 text-xs leading-relaxed text-on-surface-variant/80" title={latest.reason}>
              {latest.reason}
            </p>
          </div>
        ) : (
          <p className="rounded-pill bg-black/30 px-3.5 py-1.5 text-xs font-medium text-white/70 backdrop-blur-sm">
            {live ? "Listening to the conversation…" : "Waiting for the room to start"}
          </p>
        )}

        {live && (
          <div className="flex items-center gap-2">
            <button
              onClick={onChangeTopic}
              disabled={changing}
              title="Ask the host to move the group on to a new topic now"
              className="inline-flex items-center gap-1.5 rounded-pill bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-white/20 disabled:opacity-60"
            >
              {changing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Shuffle className="h-3.5 w-3.5" />
              )}
              Change topic
            </button>
            {earlier.length > 0 && (
              <button
                onClick={() => setShowHistory((v) => !v)}
                className="rounded-pill px-3 py-1.5 text-xs font-medium text-white/60 transition-colors hover:bg-white/10"
              >
                {showHistory ? "Hide" : `Earlier (${earlier.length})`}
              </button>
            )}
          </div>
        )}

        {showHistory && earlier.length > 0 && (
          <div className="max-h-40 w-full space-y-1.5 overflow-y-auto rounded-2xl bg-black/40 p-2 backdrop-blur-sm">
            {earlier.map((m) => (
              <div key={m.id} className="rounded-xl bg-white/5 px-3 py-2 text-left" title={m.reason}>
                <p className="text-[10px] uppercase tracking-wide text-white/40">
                  {TRIGGER[m.trigger].label} · {clock(m.at)}
                </p>
                <p className="text-sm font-semibold text-white/90">“{m.message}”</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
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
  connected,
  panelOpen,
  onTogglePanel,
  hostMuted,
  hostVoiceSupported,
  onToggleHostMute,
  onStart,
  starting,
  onEnd,
  ending,
}: {
  live: boolean;
  isOwner: boolean;
  stt: ReturnType<typeof useSpeechRecognition>;
  connected: boolean;
  panelOpen: boolean;
  onTogglePanel: () => void;
  hostMuted: boolean;
  hostVoiceSupported: boolean;
  onToggleHostMute: () => void;
  onStart: () => void;
  starting: boolean;
  onEnd: () => void;
  ending: boolean;
}) {
  return (
    <footer className="relative flex h-20 shrink-0 items-center justify-center px-4">
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Mic — talk so the AI hears you (browser speech-to-text) */}
        {stt.supported ? (
          <CtrlButton
            title={stt.listening ? "Pause talking" : "Talk — let the AI hear you"}
            active={stt.listening}
            disabled={!live || !connected}
            onClick={() => (stt.listening ? stt.stop() : stt.start())}
          >
            {stt.listening ? <Mic className="h-5 w-5 animate-pulse" /> : <MicOff className="h-5 w-5" />}
          </CtrlButton>
        ) : (
          <CtrlButton
            title="Type what you'd say (no speech-to-text here)"
            active={panelOpen}
            disabled={!live}
            onClick={onTogglePanel}
          >
            <MessageSquareText className="h-5 w-5" />
          </CtrlButton>
        )}

        {/* Host voice — the host speaks its topic changes aloud; mute to read them only */}
        <CtrlButton
          title={
            !hostVoiceSupported
              ? "Host voice isn't available in this browser"
              : hostMuted
                ? "Unmute the AI host"
                : "Mute the AI host"
          }
          active={hostVoiceSupported && !hostMuted}
          disabled={!hostVoiceSupported}
          onClick={onToggleHostMute}
        >
          {hostMuted || !hostVoiceSupported ? (
            <VolumeX className="h-5 w-5" />
          ) : (
            <Volume2 className="h-5 w-5" />
          )}
        </CtrlButton>

        {/* Camera — placeholder for the future video call */}
        <CtrlButton title="Camera (coming soon)" disabled>
          <VideoOff className="h-5 w-5" />
        </CtrlButton>

        {/* Conversation / captions */}
        <CtrlButton title="Conversation" active={panelOpen} onClick={onTogglePanel}>
          <Captions className="h-5 w-5" />
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

        {/* Leave */}
        <Link
          href="/practice"
          title="Leave"
          aria-label="Leave"
          className="grid h-12 w-14 place-items-center rounded-full bg-secondary text-on-secondary transition-colors hover:bg-secondary-container"
        >
          <PhoneOff className="h-5 w-5" />
        </Link>
      </div>

      <Link
        href="/practice"
        className="absolute right-4 hidden items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-medium text-white/60 hover:text-white sm:inline-flex"
      >
        <ArrowLeft className="h-4 w-4" /> Rooms
      </Link>
    </footer>
  );
}

/* ---------------------- Conversation side panel -------------------------- */

function ConversationPanel({
  open,
  onClose,
  history,
  selfUid,
  stt,
  live,
  connected,
  onSend,
}: {
  open: boolean;
  onClose: () => void;
  history: HistoryItem[];
  selfUid?: string;
  stt: ReturnType<typeof useSpeechRecognition>;
  live: boolean;
  connected: boolean;
  onSend: (text: string) => void;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState("");
  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [history.length, open]);

  if (!open) return null;

  return (
    <aside className="absolute inset-y-0 right-0 z-10 flex w-full max-w-sm flex-col border-l border-outline-variant bg-white text-on-surface shadow-2xl lg:w-[22rem]">
      <div className="flex items-center justify-between border-b border-outline-variant px-4 py-3">
        <span className="flex items-center gap-2 text-sm font-bold">
          <Captions className="h-4 w-4 text-primary" /> Conversation
        </span>
        <button
          onClick={onClose}
          aria-label="Close conversation"
          className="grid h-8 w-8 place-items-center rounded-lg text-on-surface-variant hover:bg-surface-container"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div ref={scroller} className="thin-scroll min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
        {history.length === 0 && (
          <p className="mt-6 text-center text-sm text-on-surface-variant">
            Nothing said yet. When people talk, their words appear here — the AI host listens to
            this and steps in with a new topic when it&apos;s time.
          </p>
        )}
        {history.map((h) =>
          h.kind === "host" ? (
            <HostLine key={h.id} message={h.message} />
          ) : (
            <TranscriptLine key={h.id} segment={h.segment} mine={h.segment.speakerId === selfUid} />
          ),
        )}
      </div>

      {/* Typed fallback for browsers without the Web Speech API (e.g. Firefox). */}
      {live && !stt.supported && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (draft.trim()) {
              onSend(draft);
              setDraft("");
            }
          }}
          className="border-t border-outline-variant p-3"
        >
          <p className="mb-2 flex items-center gap-1.5 text-[11px] text-on-surface-variant">
            <MessageSquareText className="h-3.5 w-3.5" />
            No speech-to-text here — type what you&apos;d say so the AI can follow.
          </p>
          <div className="flex items-center gap-2">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Say something…"
              className="h-10 flex-1 rounded-lg border border-outline-variant bg-surface-container-low px-3 text-sm outline-none focus:border-primary"
            />
            <button
              type="submit"
              disabled={!draft.trim() || !connected}
              className="grid h-10 w-10 place-items-center rounded-lg bg-primary text-on-primary hover:opacity-90 disabled:opacity-40"
              aria-label="Send"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </form>
      )}
    </aside>
  );
}

function TranscriptLine({ segment, mine }: { segment: TranscriptSegment; mine: boolean }) {
  return (
    <div className="flex gap-2.5">
      <ParticipantAvatar name={segment.speakerName ?? "Guest"} size={28} />
      <div className="min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-bold text-on-surface">
            {mine ? "You" : (segment.speakerName ?? "Guest")}
          </span>
          <span className="text-[11px] text-on-surface-variant">{clock(segment.at)}</span>
        </div>
        <p className="mt-0.5 text-sm leading-relaxed text-on-surface-variant">{segment.text}</p>
      </div>
    </div>
  );
}

/** A line the host spoke — set apart from human lines; `reason` only in the tooltip. */
function HostLine({ message }: { message: HostMessage }) {
  return (
    <div
      className="flex gap-2.5 rounded-xl border-l-2 border-primary bg-primary-fixed/30 px-3 py-2.5"
      title={message.reason}
    >
      <ParticipantAvatar name={HOST_NAME} isAI size={28} />
      <div className="min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-bold text-primary">{HOST_NAME}</span>
          <span className="text-[11px] text-on-surface-variant">{clock(message.at)}</span>
        </div>
        <p className="mt-0.5 text-sm font-semibold leading-relaxed text-on-surface">{message.message}</p>
        <p className="mt-1 text-[11px] text-on-surface-variant">
          {TRIGGER[message.trigger].label} · new topic: <span className="font-semibold">{message.topic}</span>
        </p>
      </div>
    </div>
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
