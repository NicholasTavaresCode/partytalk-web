import type { Metadata } from "next";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { ProfileGate } from "@/components/profile/ProfileGate";
import { AppHeader } from "@/components/app/AppHeader";
import { Container } from "@/components/ui/Container";
import { RoomsBrowser } from "@/components/practice/RoomsBrowser";

export const metadata: Metadata = {
  title: "Rooms",
  description: "Browse and create live English practice rooms with an AI host.",
};

export default function PracticePage() {
  return (
    <RequireAuth>
      <ProfileGate>
        <div className="min-h-screen bg-surface">
          <AppHeader />
          <section className="relative isolate border-b border-ink/10">
            <div aria-hidden className="bg-dots pointer-events-none absolute inset-0 -z-10" />
            <Container className="py-10">
              <span className="inline-flex items-center gap-2 rounded-pill border-2 border-ink bg-white px-3 py-1 font-label text-xs font-bold uppercase tracking-wider text-ink shadow-pop-sm">
                <span className="h-2 w-2 animate-pulse rounded-full border border-ink bg-lime" /> Live rooms
              </span>
              <h1 className="mt-4 font-display text-3xl font-extrabold tracking-tight text-ink sm:text-5xl">
                Find a room, start{" "}
                <span className="inline-block -rotate-1 rounded-xl border-2 border-ink bg-lime px-2 shadow-pop-sm">talking.</span>
              </h1>
              <p className="mt-3 max-w-2xl text-lg text-on-surface-variant">
                Accept an invitation, join a live conversation or open your own. Our AI host moves the
                group on to a new topic when it&apos;s time and force you to adapt in unexpected situations.
              </p>
            </Container>
          </section>

          <section className="py-10">
            <Container>
              <RoomsBrowser />
            </Container>
          </section>
        </div>
      </ProfileGate>
    </RequireAuth>
  );
}
