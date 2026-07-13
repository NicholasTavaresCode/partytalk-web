import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowRight,
  Headphones,
  BookOpen,
  PenLine,
  Mic,
  GraduationCap,
  Clock,
  ListChecks,
  Volume2,
  Columns2,
  Timer,
  AudioLines,
  UserRound,
} from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { IELTS_MODULES } from "@/lib/api/ielts";
import type { IeltsModuleId } from "@/lib/types";

export const metadata: Metadata = {
  title: "IELTS Exam Simulator",
  description:
    "A faithful, timed simulation of the computer-delivered IELTS exam — Listening, Reading, Writing and Speaking. A focused solo practice mode.",
};

const MODULE_ICON: Record<IeltsModuleId, typeof Headphones> = {
  listening: Headphones,
  reading: BookOpen,
  writing: PenLine,
  speaking: Mic,
};

const EXPECT = [
  { icon: Columns2, title: "Split-screen reading", body: "Passage on the left, questions on the right — independent scroll, just like exam day." },
  { icon: Volume2, title: "Once-only audio", body: "The Listening recording plays a single time with a non-seekable progress bar." },
  { icon: Timer, title: "On-screen countdown", body: "A persistent timer turns red in the final five minutes to build real exam pacing." },
  { icon: AudioLines, title: "Live speaking visualiser", body: "Record answers to the AI examiner with a real-time waveform and word count." },
];

const BANDS = [
  { band: "9", label: "Expert" },
  { band: "8", label: "Very good" },
  { band: "7", label: "Good" },
  { band: "6", label: "Competent" },
  { band: "5", label: "Modest" },
];

export default function IeltsHubPage() {
  return (
    <SiteLayout>
      {/* Hero */}
      <section className="relative overflow-hidden bg-primary text-on-primary">
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-tertiary-fixed/20 blur-3xl" />
        <Container className="relative py-16 lg:py-20">
          <span className="inline-flex items-center gap-2 rounded-pill bg-white/10 px-3.5 py-1.5 text-sm font-medium">
            <GraduationCap className="h-4 w-4" /> Solo IELTS mode
          </span>
          <h1 className="mt-5 max-w-3xl font-display text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
            Rehearse the real exam, paper by paper.
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-white/80">
            IELTS mode is a faithful recreation of the computer-delivered test interface. Unlike
            PartyTalk&apos;s group rooms, this is a focused <strong className="text-white">solo</strong>{" "}
            simulation — sit each paper under real timing before the day that counts.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button href="/ielts/listening" size="lg" variant="white">
              Start full mock test <ArrowRight className="h-5 w-5" />
            </Button>
            <Button href="#modules" size="lg" variant="ghost" className="text-white hover:bg-white/10">
              Choose a paper
            </Button>
          </div>

          <div className="mt-10 flex flex-wrap gap-x-8 gap-y-3 text-sm text-white/70">
            <span className="inline-flex items-center gap-2">
              <Clock className="h-4 w-4 text-tertiary-fixed" /> ~2h 45m full test
            </span>
            <span className="inline-flex items-center gap-2">
              <ListChecks className="h-4 w-4 text-tertiary-fixed" /> 4 papers · 40+ questions
            </span>
            <span className="inline-flex items-center gap-2">
              <UserRound className="h-4 w-4 text-tertiary-fixed" /> Practise on your own
            </span>
          </div>
        </Container>
      </section>

      {/* Modules */}
      <section id="modules" className="scroll-mt-20 bg-white py-16">
        <Container>
          <h2 className="font-display text-3xl font-extrabold tracking-tight text-primary">
            The four papers
          </h2>
          <p className="mt-3 max-w-2xl text-lg text-on-surface-variant">
            Start with any module. Each opens in the full exam interface with its own timer.
          </p>

          <div className="mt-10 grid gap-5 md:grid-cols-2">
            {IELTS_MODULES.map((m, i) => {
              const Icon = MODULE_ICON[m.id];
              return (
                <Link
                  key={m.id}
                  href={`/ielts/${m.id}`}
                  className="group flex flex-col rounded-3xl border border-outline-variant bg-surface-container-low p-7 transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-[0_18px_44px_-24px_rgba(0,30,64,0.45)]"
                >
                  <div className="flex items-center justify-between">
                    <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary text-on-primary">
                      <Icon className="h-6 w-6" />
                    </span>
                    <span className="font-display text-5xl font-extrabold text-primary/10">
                      0{i + 1}
                    </span>
                  </div>
                  <h3 className="mt-5 text-xl font-bold text-on-surface">{m.title}</h3>
                  <div className="mt-1 flex items-center gap-3 text-sm font-medium text-on-surface-variant">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-4 w-4" /> {m.duration}
                    </span>
                    <span>·</span>
                    <span>{m.questions}</span>
                  </div>
                  <p className="mt-3 flex-1 leading-relaxed text-on-surface-variant">{m.blurb}</p>
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {m.skills.map((s) => (
                      <span
                        key={s}
                        className="rounded-pill bg-white px-2.5 py-1 text-xs font-medium text-on-surface-variant"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                  <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
                    Start {m.title}
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </Link>
              );
            })}
          </div>
        </Container>
      </section>

      {/* What to expect */}
      <section className="bg-surface-container-low py-16">
        <Container>
          <h2 className="font-display text-3xl font-extrabold tracking-tight text-primary">
            Built to feel like the real thing
          </h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {EXPECT.map((e) => (
              <div key={e.title} className="rounded-3xl border border-outline-variant bg-white p-6">
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-tertiary-fixed text-on-tertiary-fixed">
                  <e.icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 font-bold text-on-surface">{e.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-on-surface-variant">{e.body}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 flex flex-col items-start justify-between gap-6 rounded-3xl border border-outline-variant bg-white p-7 lg:flex-row lg:items-center">
            <div>
              <h3 className="text-lg font-bold text-on-surface">Understand your band</h3>
              <p className="mt-1 text-sm text-on-surface-variant">
                IELTS is scored from 1 to 9. Aim high — most universities ask for 6.5–7.0.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {BANDS.map((b) => (
                <div
                  key={b.band}
                  className="flex flex-col items-center rounded-2xl border border-outline-variant bg-surface-container-low px-4 py-2"
                >
                  <span className="font-display text-xl font-extrabold text-primary">{b.band}</span>
                  <span className="text-[11px] font-medium text-on-surface-variant">{b.label}</span>
                </div>
              ))}
            </div>
          </div>
        </Container>
      </section>
    </SiteLayout>
  );
}
