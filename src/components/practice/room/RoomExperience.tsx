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
  Radio,
  Crown,
  Lightbulb,
  CheckCircle2,
  MessageSquareText,
  Loader2,
  VideoOff,
  Captions,
  X,
} from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useMe, useRoom, useRoomLifecycle } from "@/lib/queries";
import { useRoomSocket } from "@/lib/useRoomSocket";
import { useSpeechRecognition } from "@/lib/useSpeechRecognition";
import { useVoiceMesh } from "@/lib/useVoiceMesh";
import { Logo } from "@/components/brand/Logo";
import { ParticipantAvatar } from "@/components/practice/ParticipantAvatar";
import { LoadingScreen } from "@/components/app/LoadingScreen";
import { cn } from "@/lib/cn";
import type { RoomReport, SuggestionTrigger, TopicSuggestion } from "@/lib/types";

const TRIGGER: Record<SuggestionTrigger, { label: string; cls: string }> = {
  volume: { label: "After lots of talk", cls: "bg-primary-fixed text-on-primary-fixed" },
  silence: { label: "After a pause", cls: "bg-tertiary-fixed text-on-tertiary-fixed" },
  manual: { label: "On request", cls: "bg-secondary/15 text-secondary" },
};

const clock = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

export function RoomExperience({ roomId }: { roomId: string }) {
  const { user } = useAuth();
  const { data: me } = useMe();
  const { data: room, isLoading } = useRoom(roomId);
  const { join, start, end, suggest } = useRoomLifecycle(roomId);
  const rt = useRoomSocket(roomId);

  const [extra, setExtra] = useState<TopicSuggestion[]>([]);
  const [panelOpen, setPanelOpen] = useState(false);
  const stt = useSpeechRecognition(rt.sendTranscript);
  const voice = useVoiceMesh({ socket: rt.socket, roomId, enabled: room?.status === "live" });

  // Auto-join once (idempotent server-side; a 409 just means already joined).
  const joinedRef = useRef(false);
  useEffect(() => {
    if (!room || !user || joinedRef.current) return;
    if (!room.participantIds.includes(user.uid) && room.status !== "ended") {
      joinedRef.current = true;
      join.mutate();
    }
  }, [room, user, join]);

  const suggestions = useMemo(() => {
    const byId = new Map<string, TopicSuggestion>();
    [...rt.suggestions, ...extra].forEach((s) => byId.set(s.id, s));
    return [...byId.values()].sort((a, b) => b.at.localeCompare(a.at));
  }, [rt.suggestions, extra]);

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
          <VoiceIndicator voice={voice} live={live} />
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
          panelOpen={panelOpen}
        />

        <CenterSuggestion
          seedTopic={room.topic}
          persona={room.facilitatorPersona}
          live={live}
          latest={suggestions[0]}
          history={suggestions}
          onSuggest={() =>
            suggest.mutate(undefined, { onSuccess: (s) => setExtra((p) => [...p, s]) })
          }
          suggesting={suggest.isPending}
          panelOpen={panelOpen}
        />

        <TranscriptPanel
          open={panelOpen}
          onClose={() => setPanelOpen(false)}
          segments={rt.segments}
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
        voice={voice}
        connected={rt.connected}
        panelOpen={panelOpen}
        onTogglePanel={() => setPanelOpen((v) => !v)}
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
          "mx-auto grid h-full max-w-5xl auto-rows-fr place-content-center gap-3",
          gridColsClass(ids.length),
        )}
      >
        {ids.map((uid) => {
          const isSelf = uid === selfUid;
          const name = isSelf ? selfName : (presence[uid] ?? "Guest");
          const online = isSelf || presence[uid] !== undefined;
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

/* ----------------------- Center AI host suggestion ----------------------- */

function CenterSuggestion({
  seedTopic,
  persona,
  live,
  latest,
  history,
  onSuggest,
  suggesting,
  panelOpen,
}: {
  seedTopic: string;
  persona: string;
  live: boolean;
  latest?: TopicSuggestion;
  history: TopicSuggestion[];
  onSuggest: () => void;
  suggesting: boolean;
  panelOpen: boolean;
}) {
  const [showHistory, setShowHistory] = useState(false);
  const earlier = history.slice(1);

  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 flex items-center justify-center p-4 transition-[padding] duration-300",
        panelOpen && "lg:pr-[22rem]",
      )}
    >
      <div className="pointer-events-auto w-full max-w-lg rounded-3xl border border-white/10 bg-gradient-to-br from-primary-container to-primary p-6 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.7)] ring-1 ring-tertiary-fixed/20">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-tertiary-fixed">
            <Sparkles className="h-4 w-4" /> AI host
          </span>
          {latest && (
            <span
              className={cn(
                "rounded-pill px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                TRIGGER[latest.trigger].cls,
              )}
            >
              {TRIGGER[latest.trigger].label}
            </span>
          )}
        </div>

        {latest ? (
          <>
            <p className="mt-3 font-display text-2xl font-extrabold leading-snug">“{latest.topic}”</p>
            <p className="mt-2 text-sm leading-relaxed text-white/80">{latest.rationale}</p>
            <p className="mt-1 text-[11px] text-white/50">Suggested at {clock(latest.at)}</p>
          </>
        ) : (
          <>
            <p className="mt-3 font-display text-2xl font-extrabold leading-snug">“{seedTopic}”</p>
            <p className="mt-2 text-sm leading-relaxed text-white/75">
              {live
                ? "Talk it through — I'll drop a fresh angle into the middle here as the conversation flows."
                : "Your opening topic. New suggestions appear right here once the host starts the session."}
            </p>
          </>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-white/10 pt-4">
          {live && (
            <button
              onClick={onSuggest}
              disabled={suggesting}
              className="inline-flex items-center gap-2 rounded-pill bg-white/15 px-4 py-2 text-sm font-semibold transition-colors hover:bg-white/25 disabled:opacity-60"
            >
              {suggesting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Lightbulb className="h-4 w-4" />
              )}
              Suggest a topic
            </button>
          )}
          {earlier.length > 0 && (
            <button
              onClick={() => setShowHistory((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-pill px-3 py-2 text-sm font-medium text-white/70 transition-colors hover:bg-white/10"
            >
              {showHistory ? "Hide" : "Earlier topics"} ({earlier.length})
            </button>
          )}
        </div>

        {showHistory && earlier.length > 0 && (
          <div className="mt-3 max-h-40 space-y-2 overflow-y-auto pr-1">
            {earlier.map((s) => (
              <div key={s.id} className="rounded-xl bg-black/20 p-3">
                <div className="flex items-center gap-2 text-[10px] text-white/50">
                  <span className="font-bold uppercase tracking-wide">
                    {TRIGGER[s.trigger].label}
                  </span>
                  · {clock(s.at)}
                </div>
                <p className="mt-1 text-sm font-semibold">“{s.topic}”</p>
              </div>
            ))}
          </div>
        )}

        <p className="mt-4 text-[11px] italic text-white/40">{persona}</p>
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
  panelOpen,
  onTogglePanel,
  onStart,
  starting,
  onEnd,
  ending,
}: {
  live: boolean;
  isOwner: boolean;
  stt: ReturnType<typeof useSpeechRecognition>;
  voice: ReturnType<typeof useVoiceMesh>;
  connected: boolean;
  panelOpen: boolean;
  onTogglePanel: () => void;
  onStart: () => void;
  starting: boolean;
  onEnd: () => void;
  ending: boolean;
}) {
  const micReady = voice.status === "ready" || voice.status === "connected";
  return (
    <footer className="flex h-20 shrink-0 items-center justify-between gap-2 px-4">
      {/* Left — captions / transcript toggle */}
      <div className="flex w-40 items-center">
        <CtrlButton title="Transcript" active={panelOpen} onClick={onTogglePanel}>
          <Captions className="h-5 w-5" />
        </CtrlButton>
      </div>

      {/* Center — call controls */}
      <div className="flex items-center gap-2 sm:gap-3">
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
            title="Type what you'd say (no speech-to-text here)"
            active={panelOpen}
            disabled={!live}
            onClick={onTogglePanel}
          >
            <MessageSquareText className="h-5 w-5" />
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

      {/* Right — reserved to keep the center group centered */}
      <div className="hidden w-40 justify-end sm:flex">
        <Link
          href="/practice"
          className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-medium text-white/60 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" /> Rooms
        </Link>
      </div>
    </footer>
  );
}

/* ---------------------- Transcript side panel ---------------------------- */

function TranscriptPanel({
  open,
  onClose,
  segments,
  selfUid,
  stt,
  live,
  connected,
  onSend,
}: {
  open: boolean;
  onClose: () => void;
  segments: import("@/lib/types").TranscriptSegment[];
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
  }, [segments.length, open]);

  if (!open) return null;

  return (
    <aside className="absolute inset-y-0 right-0 z-10 flex w-full max-w-sm flex-col border-l border-outline-variant bg-white text-on-surface shadow-2xl lg:w-[22rem]">
      <div className="flex items-center justify-between border-b border-outline-variant px-4 py-3">
        <span className="flex items-center gap-2 text-sm font-bold">
          <Captions className="h-4 w-4 text-primary" /> Live transcript
        </span>
        <button
          onClick={onClose}
          aria-label="Close transcript"
          className="grid h-8 w-8 place-items-center rounded-lg text-on-surface-variant hover:bg-surface-container"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div ref={scroller} className="exam-scroll min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
        {segments.length === 0 && (
          <p className="mt-6 text-center text-sm text-on-surface-variant">
            Nothing said yet. When people talk, their words appear here — that&apos;s what the AI host
            listens to.
          </p>
        )}
        {segments.map((s) => {
          const mine = s.speakerId === selfUid;
          return (
            <div key={s.id} className="flex gap-2.5">
              <ParticipantAvatar name={s.speakerName ?? "Guest"} size={28} />
              <div className="min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-bold text-on-surface">
                    {mine ? "You" : (s.speakerName ?? "Guest")}
                  </span>
                  <span className="text-[11px] text-on-surface-variant">{clock(s.at)}</span>
                </div>
                <p className="mt-0.5 text-sm leading-relaxed text-on-surface-variant">{s.text}</p>
              </div>
            </div>
          );
        })}
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
