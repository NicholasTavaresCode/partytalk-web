"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Mic,
  MicOff,
  Sparkles,
  Send,
  Users,
  PhoneOff,
  Play,
  Radio,
  Crown,
  Lightbulb,
  CheckCircle2,
  MessageSquareText,
  Loader2,
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

  return (
    <div className="flex h-screen flex-col bg-surface">
      {/* Top bar */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-outline-variant bg-white px-4">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href="/practice"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-on-surface-variant hover:bg-surface-container"
          >
            <ArrowLeft className="h-4 w-4" /> <span className="hidden sm:inline">Rooms</span>
          </Link>
          <span className="h-6 w-px bg-outline-variant" />
          <Logo className="h-7 w-7" />
          <div className="min-w-0">
            <p className="truncate text-sm font-bold leading-tight text-on-surface">{room.topic}</p>
            <p className="text-[11px] leading-tight text-on-surface-variant">
              {room.participantIds.length}/{room.maxParticipants} · {room.status}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {room.status === "live" && (
            <span className="hidden items-center gap-1.5 rounded-lg bg-secondary/10 px-2.5 py-1 text-sm font-bold text-secondary sm:inline-flex">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-secondary" /> Live
            </span>
          )}
          {isOwner && room.status === "waiting" && (
            <button
              onClick={() => start.mutate()}
              disabled={start.isPending}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-semibold text-on-primary hover:opacity-90 disabled:opacity-60"
            >
              <Play className="h-4 w-4" /> {start.isPending ? "Starting…" : "Start session"}
            </button>
          )}
          {isOwner && room.status === "live" && (
            <button
              onClick={() => end.mutate()}
              disabled={end.isPending}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-secondary px-3 text-sm font-semibold text-on-secondary hover:bg-secondary-container disabled:opacity-60"
            >
              <PhoneOff className="h-4 w-4" /> {end.isPending ? "Ending…" : "End & report"}
            </button>
          )}
          <Link
            href="/practice"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-outline px-3 text-sm font-semibold text-on-surface-variant hover:bg-surface-container"
          >
            Leave
          </Link>
        </div>
      </header>

      {/* Body */}
      <main className="min-h-0 flex-1 overflow-y-auto lg:grid lg:grid-cols-[1fr_380px] lg:overflow-hidden">
        {/* Left — AI host suggestions */}
        <section className="exam-scroll flex flex-col gap-4 p-4 lg:overflow-y-auto">
          <HostPanel
            persona={room.facilitatorPersona}
            seedTopic={room.topic}
            status={room.status}
            latest={suggestions[0]}
            onSuggest={() =>
              suggest.mutate(undefined, { onSuccess: (s) => setExtra((p) => [...p, s]) })
            }
            suggesting={suggest.isPending}
          />

          {suggestions.length > 1 && (
            <div>
              <p className="mb-2 px-1 text-label-caps font-label-caps uppercase text-on-surface-variant">
                Earlier topics
              </p>
              <div className="space-y-2">
                {suggestions.slice(1).map((s) => (
                  <SuggestionRow key={s.id} s={s} />
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Right — presence, voice, transcript */}
        <aside className="flex min-h-0 flex-col border-t border-outline-variant bg-white lg:border-l lg:border-t-0">
          <ParticipantsBar
            room={room}
            presence={rt.presence}
            selfUid={user?.uid}
            selfName={me?.displayName ?? user?.displayName ?? "You"}
          />
          <VoiceBar voice={voice} live={room.status === "live"} />

          <div className="border-y border-outline-variant px-4 py-2">
            <span className="text-label-caps font-label-caps uppercase text-on-surface-variant">
              Live transcript
            </span>
          </div>
          <Transcript segments={rt.segments} selfUid={user?.uid} />
          <SpeakControls
            stt={stt}
            live={room.status === "live"}
            connected={rt.connected}
            onSend={rt.sendTranscript}
          />
        </aside>
      </main>

      {/* Hidden remote audio (P2P mesh, when signaling is live) */}
      {voice.remoteStreams.map((r) => (
        <RemoteAudio key={r.uid} stream={r.stream} />
      ))}
    </div>
  );
}

/* ------------------------------- Host panel ------------------------------ */

function HostPanel({
  persona,
  seedTopic,
  status,
  latest,
  onSuggest,
  suggesting,
}: {
  persona: string;
  seedTopic: string;
  status: string;
  latest?: TopicSuggestion;
  onSuggest: () => void;
  suggesting: boolean;
}) {
  return (
    <div className="rounded-2xl bg-primary p-5 text-on-primary">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-tertiary-fixed">
        <Sparkles className="h-4 w-4" /> AI host
      </div>

      {latest ? (
        <>
          <div className="mt-2 flex items-center gap-2">
            <span
              className={cn(
                "rounded-pill px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                TRIGGER[latest.trigger].cls,
              )}
            >
              {TRIGGER[latest.trigger].label}
            </span>
            <span className="text-[11px] text-white/60">{clock(latest.at)}</span>
          </div>
          <p className="mt-2 font-display text-xl font-bold leading-snug">“{latest.topic}”</p>
          <p className="mt-1.5 text-sm text-white/75">{latest.rationale}</p>
        </>
      ) : (
        <>
          <p className="mt-2 font-display text-xl font-bold leading-snug">“{seedTopic}”</p>
          <p className="mt-1.5 text-sm text-white/70">
            {status === "live"
              ? "Talk it through — I'll suggest a fresh angle as the conversation flows."
              : "This is your opening topic. Suggestions appear here once the session starts."}
          </p>
        </>
      )}

      <p className="mt-3 border-t border-white/10 pt-3 text-xs text-white/60">{persona}</p>

      {status === "live" && (
        <button
          onClick={onSuggest}
          disabled={suggesting}
          className="mt-3 inline-flex items-center gap-2 rounded-lg bg-white/10 px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/20 disabled:opacity-60"
        >
          {suggesting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lightbulb className="h-4 w-4" />}
          Suggest a new topic
        </button>
      )}
    </div>
  );
}

function SuggestionRow({ s }: { s: TopicSuggestion }) {
  return (
    <div className="rounded-xl border border-outline-variant bg-white p-3.5">
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "rounded-pill px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
            TRIGGER[s.trigger].cls,
          )}
        >
          {TRIGGER[s.trigger].label}
        </span>
        <span className="text-[11px] text-on-surface-variant">{clock(s.at)}</span>
      </div>
      <p className="mt-1.5 font-semibold text-on-surface">“{s.topic}”</p>
      <p className="mt-0.5 text-sm text-on-surface-variant">{s.rationale}</p>
    </div>
  );
}

/* ------------------------------ Participants ----------------------------- */

function ParticipantsBar({
  room,
  presence,
  selfUid,
  selfName,
}: {
  room: { participantIds: string[]; ownerId: string };
  presence: Record<string, string | undefined>;
  selfUid?: string;
  selfName: string;
}) {
  return (
    <div className="flex items-center gap-2 border-b border-outline-variant px-4 py-3">
      <Users className="h-4 w-4 text-on-surface-variant" />
      <div className="flex flex-1 flex-wrap gap-1.5">
        {room.participantIds.map((uid) => {
          const isSelf = uid === selfUid;
          const name = isSelf ? selfName : (presence[uid] ?? "Guest");
          const online = isSelf || presence[uid] !== undefined;
          return (
            <span
              key={uid}
              className="inline-flex items-center gap-1.5 rounded-pill border border-outline-variant bg-surface-container-low py-0.5 pl-0.5 pr-2 text-xs font-medium"
            >
              <ParticipantAvatar name={name} size={20} speaking={online} />
              <span className="text-on-surface">{name}</span>
              {uid === room.ownerId && <Crown className="h-3 w-3 text-tertiary" />}
            </span>
          );
        })}
      </div>
    </div>
  );
}

/* --------------------------------- Voice --------------------------------- */

function VoiceBar({
  voice,
  live,
}: {
  voice: ReturnType<typeof useVoiceMesh>;
  live: boolean;
}) {
  if (!live) return null;
  const label =
    voice.status === "connected"
      ? `Voice connected · ${voice.peerCount} peer${voice.peerCount === 1 ? "" : "s"}`
      : voice.status === "requesting-mic"
        ? "Requesting microphone…"
        : voice.status === "mic-denied"
          ? "Microphone blocked"
          : "Voice ready · waiting for peers";

  return (
    <div className="flex items-center justify-between border-b border-outline-variant bg-surface-container-low px-4 py-2">
      <span className="flex items-center gap-2 text-xs font-medium text-on-surface-variant">
        <Radio className={cn("h-4 w-4", voice.status === "connected" ? "text-emerald-500" : "text-on-surface-variant")} />
        {label}
      </span>
      {(voice.status === "ready" || voice.status === "connected") && (
        <button
          onClick={voice.toggleMute}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors",
            voice.muted ? "bg-secondary/10 text-secondary" : "bg-surface-container text-on-surface",
          )}
        >
          {voice.muted ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
          {voice.muted ? "Muted" : "Mic on"}
        </button>
      )}
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

/* ------------------------------- Transcript ------------------------------ */

function Transcript({
  segments,
  selfUid,
}: {
  segments: import("@/lib/types").TranscriptSegment[];
  selfUid?: string;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [segments.length]);

  return (
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
  );
}

/* ----------------------------- Speak controls ---------------------------- */

function SpeakControls({
  stt,
  live,
  connected,
  onSend,
}: {
  stt: ReturnType<typeof useSpeechRecognition>;
  live: boolean;
  connected: boolean;
  onSend: (text: string) => void;
}) {
  const [draft, setDraft] = useState("");

  if (!live) {
    return (
      <div className="border-t border-outline-variant p-3 text-center text-xs text-on-surface-variant">
        Waiting for the host to start the session…
      </div>
    );
  }

  if (stt.supported) {
    return (
      <div className="flex flex-col items-center gap-2 border-t border-outline-variant p-3">
        <button
          onClick={() => (stt.listening ? stt.stop() : stt.start())}
          disabled={!connected}
          className={cn(
            "inline-flex h-12 items-center gap-2.5 rounded-full px-6 font-semibold transition-all disabled:opacity-50",
            stt.listening
              ? "bg-secondary text-on-secondary"
              : "bg-primary text-on-primary hover:opacity-90",
          )}
        >
          {stt.listening ? <Mic className="h-5 w-5 animate-pulse" /> : <Mic className="h-5 w-5" />}
          {stt.listening ? "Listening… tap to pause" : "Talk — let the AI hear you"}
        </button>
        <p className="text-[11px] text-on-surface-variant">
          Your speech is transcribed in your browser and shared with the room.
        </p>
      </div>
    );
  }

  // Fallback for browsers without the Web Speech API (e.g. Firefox).
  return (
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
        Speech-to-text isn&apos;t available here — type what you&apos;d say so the AI can follow.
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
