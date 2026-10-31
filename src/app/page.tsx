import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, FileText, Mic, UserPlus } from "lucide-react";
import { Wordmark } from "@/components/brand/Wordmark";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { LandingAuthLink } from "@/components/marketing/LandingAuthLink";
import { RoomPreview } from "@/components/marketing/RoomPreview";
import { IELTS_ENABLED } from "@/lib/features";

export const metadata: Metadata = {
  description:
    "Open a small live voice room, invite your group and practise English out loud. An AI host brings fresh topics as you talk and leaves everyone a report at the end.",
};

const STEPS = [
  { icon: UserPlus, title: "Invite your group", body: "Up to 4 friends or classmates" },
  { icon: Mic, title: "Talk by voice", body: "The AI host keeps topics coming" },
  { icon: FileText, title: "Get your report", body: "Highlights and tips at the end" },
];

/** Staggered entrance for the hero's pieces. */
const enter = (step: number) => ({ animationDelay: `${step * 90}ms` });

/**
 * The landing page is one screen: what PartyTalk is for, one way in, and a
 * look at a live room. Everything else lives behind "Start a room".
 */
export default function HomePage() {
  return (
    <div className="relative isolate flex min-h-[100dvh] flex-col overflow-hidden bg-primary text-white">
      {/* Background: slow-drifting glows over a faint dot texture. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-40 -top-40 h-[36rem] w-[36rem] rounded-full bg-primary-container blur-3xl motion-safe:animate-aurora" />
        <div
          className="absolute -right-32 top-1/4 h-[32rem] w-[32rem] rounded-full bg-on-primary-fixed-variant/60 blur-3xl motion-safe:animate-aurora"
          style={{ animationDelay: "-7s" }}
        />
        <div
          className="absolute -bottom-48 left-1/3 h-[26rem] w-[26rem] rounded-full bg-tertiary-fixed/10 blur-3xl motion-safe:animate-aurora"
          style={{ animationDelay: "-13s" }}
        />
        <div className="bg-dots absolute inset-0" />
      </div>

      <Container className="flex h-16 shrink-0 items-center justify-between">
        <Link href="/" aria-label="PartyTalk home" className="rounded-lg">
          <Wordmark onDark />
        </Link>
        <LandingAuthLink />
      </Container>

      <Container className="grid flex-1 items-center gap-16 py-8 short:py-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)] lg:py-6 xl:gap-24">
        <div>
          <p
            className="inline-flex items-center gap-2 rounded-pill bg-white/10 px-3.5 py-1.5 text-sm font-medium text-white/85 ring-1 ring-white/15 motion-safe:animate-fade-up short:hidden sm:short:inline-flex"
            style={enter(0)}
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inset-0 rounded-full bg-emerald-400 motion-safe:animate-ping" />
              <span className="relative h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            Live voice rooms with an AI host
          </p>

          {/* "Start speaking it." is ~8.4em wide: each size keeps it on one line in its column. */}
          <h1
            className="mt-6 font-display text-[2.4rem] font-extrabold leading-[1.04] tracking-tight motion-safe:animate-fade-up short:mt-0 short:text-[2.15rem] sm:short:mt-4 sm:text-6xl lg:text-[3.25rem] xl:text-[3.75rem] lg:short:text-[3rem]"
            style={enter(1)}
          >
            Stop studying English.
            <span className="block bg-gradient-to-r from-tertiary-fixed to-tertiary-fixed-dim bg-clip-text pb-1 text-transparent">
              Start speaking it.
            </span>
          </h1>

          <p
            className="mt-6 max-w-xl text-base leading-relaxed text-white/70 motion-safe:animate-fade-up short:mt-4 sm:text-lg sm:short:text-base"
            style={enter(2)}
          >
            Open a small voice room, invite your group and just talk. An AI host listens along,
            brings in a fresh topic whenever the conversation needs one, and leaves everyone a
            report at the end.
          </p>

          <div
            className="mt-8 flex flex-col gap-3 motion-safe:animate-fade-up short:mt-6 sm:flex-row sm:items-center sm:gap-5"
            style={enter(3)}
          >
            <Button
              href="/practice"
              size="lg"
              variant="gold"
              className="h-14 rounded-pill px-8 text-lg shadow-[0_10px_40px_-10px_rgba(255,225,109,0.6)]"
            >
              Start a room
              <ArrowRight className="h-5 w-5" />
            </Button>
            <span className="text-center text-sm text-white/55 sm:text-left">
              Sign in with Google · Nothing to install
            </span>
          </div>
          {IELTS_ENABLED && (
            <Link href="/ielts" className="mt-4 inline-block text-sm font-semibold text-white/70 hover:text-white">
              Or practise for IELTS on your own →
            </Link>
          )}

          <ol
            className="mt-10 grid grid-cols-3 gap-3 border-t border-white/10 pt-6 motion-safe:animate-fade-up short:mt-6 short:pt-4 sm:gap-6"
            style={enter(4)}
          >
            {STEPS.map((step) => (
              <li key={step.title} className="flex flex-col gap-2.5 sm:flex-row sm:items-start sm:gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/10 text-tertiary-fixed ring-1 ring-white/10">
                  <step.icon className="h-[18px] w-[18px]" />
                </span>
                <span>
                  <span className="block text-sm font-semibold">{step.title}</span>
                  <span className="mt-0.5 block text-xs leading-snug text-white/55 short:hidden sm:short:block">{step.body}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>

        <div className="hidden justify-center motion-safe:animate-fade-up lg:flex" style={enter(3)}>
          <RoomPreview className="w-full max-w-[30rem] short:max-w-[26rem]" />
        </div>
      </Container>

      <Container className="flex h-12 shrink-0 items-center justify-between text-xs text-white/40">
        <span>© 2026 PartyTalk</span>
        <span>Works best in Chrome or Edge</span>
      </Container>
    </div>
  );
}
