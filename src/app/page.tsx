import type { Metadata } from "next";
import Link from "next/link";
import { Wordmark } from "@/components/brand/Wordmark";
import { LandingAuthLink } from "@/components/marketing/LandingAuthLink";
import { LandingGate } from "@/components/marketing/LandingGate";
import { RoomPreview } from "@/components/marketing/RoomPreview";
import { LandingSignInButton } from "@/components/marketing/LandingSignInButton";
import { cn } from "@/lib/cn";

export const metadata: Metadata = {
  description:
    "Open a small voice room with your group and practise English out loud. An AI host listens in, throws in an unexpected new topic when one runs dry, and writes everyone a report at the end.",
};

/** How a room goes, as the hero card's three chips. */
const STEPS = [
  {
    emoji: "✉️",
    title: "Invite your group",
    cls: "border border-ink/10 bg-surface-container text-on-surface",
  },
  { emoji: "🎙️", title: "Talk by voice", cls: "border-2 border-ink bg-lime text-ink shadow-pop-sm" },
  { emoji: "📊", title: "Get your report", cls: "border border-secondary/60 bg-coral/15 text-secondary" },
];

const PILLS = [
  {
    emoji: "🎙️",
    label: "Real voices, small rooms",
    cls: "border-ink/10 bg-surface-container text-on-surface",
  },
  { emoji: "🤖", label: "AI host changes the topic", cls: "border-ink bg-lime/40 text-ink" },
  { emoji: "📊", label: "Report for the whole group", cls: "border-purple/30 bg-purple-light text-purple" },
  { emoji: "🔒", label: "Invite-only", cls: "border-secondary/60 bg-coral/15 text-secondary" },
];

/** Staggered entrance for the hero's pieces. */
const enter = (i: number) => ({ animationDelay: `${i * 80}ms` });

/**
 * The landing page is one screen: what PartyTalk is for, one way in, and a
 * look at a live room. It's for people who aren't signed in: LandingGate sends
 * a signed-in user to their rooms.
 */
export default function HomePage() {
  return (
    <LandingGate>
      <div className="flex min-h-[100dvh] flex-col bg-cream text-ink">
        <header className="z-30 flex h-16 shrink-0 items-center justify-between border-b border-ink/5 bg-cream/90 px-6 backdrop-blur-md lg:px-10">
          <Link href="/" aria-label="PartyTalk" className="flex items-center gap-2 rounded-pill">
            <Wordmark logoClassName="h-10 w-10" textClassName="text-2xl" />
            <span className="hidden rounded-pill bg-purple px-2.5 py-0.5 font-label text-[11px] font-bold uppercase tracking-wider text-white sm:inline-flex">
              Voice rooms
            </span>
          </Link>
          <LandingAuthLink />
        </header>

        <main className="relative isolate mx-auto flex w-full max-w-[1360px] flex-1 flex-col justify-center px-6 py-10 lg:px-10 lg:py-6 short:py-4">
          <div aria-hidden className="bg-dots pointer-events-none absolute inset-0 -z-10" />

          <div className="grid items-center gap-14 lg:grid-cols-12 lg:gap-10 xl:gap-14">
            <div className="space-y-5 lg:col-span-6 short:space-y-3.5">
              <div className="flex flex-wrap items-center gap-2 motion-safe:animate-fade-up" style={enter(0)}>
                <span className="inline-flex items-center gap-2 rounded-pill border-2 border-ink bg-white px-3.5 py-1 font-display text-xs font-bold shadow-pop-sm">
                  🔥 English practice that keeps you on your toes
                </span>
                <span className="inline-flex rotate-1 items-center rounded-pill bg-coral px-2.5 py-1 font-label text-[11px] font-bold uppercase tracking-wider text-ink">
                  No textbook
                </span>
              </div>

              <div className="space-y-3 motion-safe:animate-fade-up" style={enter(1)}>
                <h1 className="font-display text-[2.6rem] font-extrabold leading-[1.04] tracking-tight sm:text-5xl lg:text-[3.1rem] xl:text-[3.3rem] short:text-[2.5rem] lg:short:text-[2.9rem]">
                  Learning comes with{" "}
                  <span className="relative inline-block -rotate-[1.5deg] rounded-xl border-2 border-ink bg-lime px-2 shadow-pop-sm">
                    friction.
                  </span>
                </h1>
                <p className="max-w-xl text-base font-medium leading-relaxed text-on-surface-variant lg:text-[17px]">
                  Open a small voice room with your group and just talk. Our AI host keeps challenging the
                  group: when a topic runs dry, it throws in a completely different one, so you learn to
                  improvise and think fast in English. Everyone gets a report when the room ends.
                </p>
              </div>

              <div
                className="space-y-3 rounded-2xl border-2 border-ink bg-white p-4 shadow-pop motion-safe:animate-fade-up"
                style={enter(2)}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-display text-xs font-bold text-on-surface">How a room works</span>
                  <span className="rounded-pill bg-purple-light px-2 py-0.5 font-label text-[11px] font-bold text-purple">
                    5–60 min sessions
                  </span>
                </div>
                <ol className="grid grid-cols-3 gap-2">
                  {STEPS.map((step, i) => (
                    <li
                      key={step.title}
                      className={cn(
                        "flex flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-center font-display text-xs font-bold sm:flex-row",
                        step.cls,
                      )}
                    >
                      <span aria-hidden>{step.emoji}</span>
                      <span>
                        <span className="sr-only">{i + 1}. </span>
                        {step.title}
                      </span>
                    </li>
                  ))}
                </ol>
                <LandingSignInButton />
              </div>

              <p
                className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold text-on-surface-variant motion-safe:animate-fade-up"
                style={enter(3)}
              >
                <span>Nothing to install: your Google account is all you need</span>
                <span className="rounded-pill border border-ink/10 bg-white px-2.5 py-1 text-ink">
                  Up to 5 people per room
                </span>
              </p>
            </div>

            <div className="motion-safe:animate-fade-up lg:col-span-6" style={enter(2)}>
              <RoomPreview className="mx-auto max-w-[36rem]" />
            </div>
          </div>
        </main>

        <footer className="z-20 flex min-h-14 shrink-0 items-center justify-between gap-4 border-t border-ink/10 bg-white px-6 py-2.5 lg:px-10">
          <ul className="no-scrollbar flex items-center gap-2 overflow-x-auto">
            {PILLS.map((pill) => (
              <li
                key={pill.label}
                className={cn(
                  "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-pill border px-3.5 py-1 font-display text-xs font-bold",
                  pill.cls,
                )}
              >
                <span aria-hidden>{pill.emoji}</span>
                {pill.label}
              </li>
            ))}
          </ul>
          <span className="hidden shrink-0 font-label text-xs font-bold text-on-surface-variant md:block">
            © {new Date().getFullYear()} PartyTalk
          </span>
        </footer>
      </div>
    </LandingGate>
  );
}
