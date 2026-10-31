import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, GraduationCap } from "lucide-react";
import { Wordmark } from "@/components/brand/Wordmark";

export const metadata: Metadata = {
  title: "Page not found",
};

/**
 * The 404 for every unmatched URL (and any `notFound()`), in the landing's style:
 * the AI host does what it does best and changes the topic.
 */
export default function NotFound() {
  return (
    <div className="relative isolate flex min-h-[100dvh] flex-col bg-cream text-ink">
      <div aria-hidden className="bg-dots pointer-events-none absolute inset-0 -z-10" />

      <header className="flex h-16 shrink-0 items-center border-b border-ink/5 bg-cream/90 px-6 backdrop-blur-md lg:px-10">
        <Link href="/" aria-label="PartyTalk home" className="rounded-pill">
          <Wordmark logoClassName="h-10 w-10" textClassName="text-2xl" />
        </Link>
      </header>

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center px-6 py-12 text-center">
        <p
          aria-hidden
          className="font-display text-[6.5rem] font-extrabold leading-none tracking-tight sm:text-[9rem]"
        >
          4
          <span className="mx-1 inline-block -rotate-6 rounded-3xl border-[3px] border-ink bg-lime px-3 shadow-pop">
            0
          </span>
          4
        </p>

        <h1 className="mt-8 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
          This page went <span className="whitespace-nowrap">off-topic.</span>
        </h1>
        <p className="mt-3 max-w-md text-base font-medium leading-relaxed text-on-surface-variant">
          The link is broken, or the page has moved. Happens to the best conversations.
        </p>

        {/* The host steps in, as it does in a room. */}
        <div className="mt-8 w-full rounded-2xl border-2 border-ink bg-gradient-to-r from-amber-200 via-lime to-lime-light p-3.5 text-left shadow-pop-sm">
          <div className="flex items-start gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ink text-lime">
              <GraduationCap className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <span className="rounded-pill bg-white px-2 py-px font-label text-[10px] font-bold uppercase tracking-wider text-purple">
                AI host · New topic
              </span>
              <p className="mt-1.5 font-display text-base font-bold leading-snug sm:text-lg">
                “Ok. Now let&apos;s talk about{" "}
                <span className="rounded bg-white px-1 font-extrabold underline decoration-coral decoration-2 underline-offset-2">
                  a page that exists
                </span>
                .”
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
          <Link
            href="/"
            className="inline-flex h-12 items-center gap-2 rounded-pill border-2 border-ink bg-lime px-6 font-display font-extrabold text-ink shadow-pop transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:bg-lime-light hover:shadow-pop-sm"
          >
            Back to PartyTalk <ArrowRight className="h-5 w-5" />
          </Link>
          <Link
            href="/practice"
            className="inline-flex h-12 items-center rounded-pill border-2 border-ink bg-white px-6 font-display font-bold text-ink transition-colors hover:bg-lime/30"
          >
            Your rooms
          </Link>
        </div>
      </main>
    </div>
  );
}
