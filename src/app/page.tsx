import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowRight,
  Sparkles,
  Users,
  MessageSquareText,
  Mic,
  Globe,
  Check,
  Headphones,
  BookOpen,
  PenLine,
  GraduationCap,
} from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { RoomPreview } from "@/components/marketing/RoomPreview";
import { ParticipantAvatar } from "@/components/practice/ParticipantAvatar";
import { cn } from "@/lib/cn";
import { IELTS_ENABLED } from "@/lib/features";

export const metadata: Metadata = {
  description:
    "Join small live rooms to practise English out loud with learners around the world, guided by a friendly AI host." +
    (IELTS_ENABLED ? " Plus a faithful IELTS exam simulator." : ""),
};

const LANGUAGES = [
  { label: "English", flag: "🇬🇧", active: true },
  { label: "Spanish", flag: "🇪🇸" },
  { label: "French", flag: "🇫🇷" },
  { label: "Japanese", flag: "🇯🇵" },
  { label: "German", flag: "🇩🇪" },
  { label: "Portuguese", flag: "🇧🇷" },
];

const STEPS = [
  {
    icon: Users,
    title: "Join a live room",
    body: "Pick a topic and level that fits you — from first small talk to advanced debate — and drop into a room with a handful of other learners.",
  },
  {
    icon: MessageSquareText,
    title: "Talk with real people",
    body: "Speak out loud, listen, and react. Everyone is here to practise, so there is no pressure to be perfect — only to be understood.",
  },
  {
    icon: Sparkles,
    title: "Your AI host guides you",
    body: "A friendly AI keeps the conversation flowing, gently corrects mistakes, and suggests phrases exactly when you need them.",
  },
];

const FEATURES = [
  {
    icon: Mic,
    title: "Speak from day one",
    body: "Confidence comes from talking. PartyTalk gets you speaking in your first minute, not your tenth lesson.",
  },
  {
    icon: Sparkles,
    title: "Gentle, instant feedback",
    body: "The AI host nudges grammar and pronunciation in the moment — never interrupting the flow of a real chat.",
  },
  {
    icon: Globe,
    title: "Learners worldwide",
    body: "Practise with people from dozens of countries and hear English the way it's really spoken.",
  },
  ...(IELTS_ENABLED
    ? [
        {
          icon: GraduationCap,
          title: "Serious exam prep",
          body: "Switch to IELTS mode for a faithful, timed simulation of all four exam papers.",
        },
      ]
    : []),
];

export default function HomePage() {
  return (
    <SiteLayout>
      {/* ---------------------------------- HERO --------------------------------- */}
      <section className="relative overflow-hidden bg-white">
        <div className="pointer-events-none absolute inset-0 bg-grid opacity-60" />
        <div className="pointer-events-none absolute -left-24 -top-24 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute -right-16 top-24 h-72 w-72 rounded-full bg-tertiary-fixed/40 blur-3xl" />

        <Container className="relative grid gap-12 py-16 lg:grid-cols-2 lg:items-center lg:py-24">
          <div className="animate-fade-up">
            <span className="inline-flex items-center gap-2 rounded-pill border border-outline-variant bg-white px-3.5 py-1.5 text-sm font-medium text-on-surface-variant shadow-sm">
              <Sparkles className="h-4 w-4 text-primary" />
              AI-guided group conversation
            </span>
            <h1 className="mt-5 font-display text-4xl font-extrabold leading-[1.05] tracking-tight text-primary sm:text-5xl lg:text-6xl">
              Speak English with the world&nbsp;— not at a screen.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-on-surface-variant">
              PartyTalk drops you into small live rooms with other learners and a friendly AI host
              that keeps things flowing, corrects gently, and helps you find the words.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button href="/practice" size="lg">
                Start a group room
                <ArrowRight className="h-5 w-5" />
              </Button>
              {IELTS_ENABLED && (
                <Button href="/ielts" size="lg" variant="outline">
                  Practise for IELTS
                </Button>
              )}
            </div>

            <div className="mt-9 flex items-center gap-4">
              <div className="flex -space-x-3">
                {["Lucas", "Mei", "Sofia", "Priya", "Kenji"].map((n) => (
                  <span key={n} className="rounded-full ring-2 ring-white">
                    <ParticipantAvatar name={n} size={36} />
                  </span>
                ))}
              </div>
              <p className="text-sm text-on-surface-variant">
                <span className="font-bold text-on-surface">1,200+</span> learners practising today
              </p>
            </div>
          </div>

          <div className="flex justify-center lg:justify-end">
            <div className="animate-float">
              <RoomPreview />
            </div>
          </div>
        </Container>
      </section>

      {/* -------------------------------- LANGUAGES ------------------------------ */}
      <section className="border-y border-outline-variant bg-surface-container-low">
        <Container className="flex flex-col items-center gap-5 py-8 lg:flex-row lg:justify-between">
          <p className="text-sm font-semibold uppercase tracking-wide text-on-surface-variant">
            Choose your language
          </p>
          <div className="flex flex-wrap justify-center gap-2.5">
            {LANGUAGES.map((lang) => (
              <span
                key={lang.label}
                className={cn(
                  "inline-flex items-center gap-2 rounded-pill border px-3.5 py-1.5 text-sm font-medium",
                  lang.active
                    ? "border-primary bg-primary text-on-primary"
                    : "border-outline-variant bg-white text-on-surface-variant",
                )}
              >
                <span>{lang.flag}</span>
                {lang.label}
                {!lang.active && (
                  <span className="rounded-pill bg-surface-container px-1.5 py-0.5 text-[10px] font-bold uppercase text-on-surface-variant">
                    Soon
                  </span>
                )}
                {lang.active && <Check className="h-3.5 w-3.5" />}
              </span>
            ))}
          </div>
        </Container>
      </section>

      {/* ------------------------------- HOW IT WORKS ---------------------------- */}
      <section id="how" className="scroll-mt-20 bg-white py-20">
        <Container>
          <div className="max-w-2xl">
            <p className="text-sm font-bold uppercase tracking-wide text-primary">How it works</p>
            <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-primary sm:text-4xl">
              Fluency is a conversation, not a flashcard.
            </h2>
            <p className="mt-4 text-lg text-on-surface-variant">
              Three simple steps stand between you and speaking English out loud today.
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {STEPS.map((step, i) => (
              <div
                key={step.title}
                className="relative rounded-3xl border border-outline-variant bg-surface-container-low p-7"
              >
                <span className="absolute right-6 top-6 font-display text-5xl font-extrabold text-primary/10">
                  0{i + 1}
                </span>
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary text-on-primary">
                  <step.icon className="h-6 w-6" />
                </span>
                <h3 className="mt-5 text-xl font-bold text-on-surface">{step.title}</h3>
                <p className="mt-2.5 leading-relaxed text-on-surface-variant">{step.body}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* -------------------------------- FEATURES ------------------------------- */}
      <section className="bg-surface-container-low py-20">
        <Container>
          <div className={cn("grid gap-4 sm:grid-cols-2", !IELTS_ENABLED && "lg:grid-cols-3")}>
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="flex gap-4 rounded-3xl border border-outline-variant bg-white p-7"
              >
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-tertiary-fixed text-on-tertiary-fixed">
                  <f.icon style={{ width: 22, height: 22 }} />
                </span>
                <div>
                  <h3 className="text-lg font-bold text-on-surface">{f.title}</h3>
                  <p className="mt-1.5 leading-relaxed text-on-surface-variant">{f.body}</p>
                </div>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* ------------------------------- IELTS PROMO ----------------------------- */}
      {IELTS_ENABLED && (
      <section className="bg-white py-20">
        <Container>
          <div className="overflow-hidden rounded-[2rem] bg-primary text-on-primary">
            <div className="grid gap-10 p-8 sm:p-12 lg:grid-cols-2 lg:items-center">
              <div>
                <span className="inline-flex items-center gap-2 rounded-pill bg-white/10 px-3 py-1.5 text-sm font-medium">
                  <GraduationCap className="h-4 w-4" /> Solo IELTS mode
                </span>
                <h2 className="mt-5 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
                  Sit the IELTS before you sit the IELTS.
                </h2>
                <p className="mt-4 max-w-lg text-white/80">
                  A faithful, timed simulation of the computer-delivered exam — the same navy chrome,
                  split-screen reading, once-only audio and on-screen word count. Practise all four
                  papers on your own.
                </p>
                <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                  <Button href="/ielts" size="lg" variant="white">
                    Explore IELTS mode
                    <ArrowRight className="h-5 w-5" />
                  </Button>
                  <Button
                    href="/ielts/reading"
                    size="lg"
                    variant="ghost"
                    className="text-white hover:bg-white/10"
                  >
                    Try a reading test
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[
                  { icon: Headphones, label: "Listening", href: "/ielts/listening", meta: "30 min · 40 Q" },
                  { icon: BookOpen, label: "Reading", href: "/ielts/reading", meta: "60 min · 40 Q" },
                  { icon: PenLine, label: "Writing", href: "/ielts/writing", meta: "60 min · 2 tasks" },
                  { icon: Mic, label: "Speaking", href: "/ielts/speaking", meta: "11–14 min · 3 parts" },
                ].map((m) => (
                  <Link
                    key={m.label}
                    href={m.href}
                    className="group rounded-2xl border border-white/15 bg-white/5 p-5 transition-colors hover:bg-white/10"
                  >
                    <m.icon className="h-6 w-6 text-tertiary-fixed" />
                    <p className="mt-3 text-lg font-bold">{m.label}</p>
                    <p className="text-sm text-white/70">{m.meta}</p>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </Container>
      </section>
      )}

      {/* --------------------------------- CTA ----------------------------------- */}
      <section className="bg-surface-container-low py-20">
        <Container className="text-center">
          <h2 className="mx-auto max-w-2xl font-display text-3xl font-extrabold tracking-tight text-primary sm:text-4xl">
            Your next conversation is one click away.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-on-surface-variant">
            No downloads, no waiting. Jump into a live room and start speaking English today.
          </p>
          <div className="mt-8 flex justify-center">
            <Button href="/practice" size="lg">
              Find a room
              <ArrowRight className="h-5 w-5" />
            </Button>
          </div>
        </Container>
      </section>
    </SiteLayout>
  );
}
