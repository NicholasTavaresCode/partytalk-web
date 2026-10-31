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
          <section className="border-b border-outline-variant bg-white">
            <Container className="py-10">
              <span className="inline-flex items-center gap-2 rounded-pill bg-secondary/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-secondary">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-secondary" /> Live rooms
              </span>
              <h1 className="mt-4 font-display text-3xl font-extrabold tracking-tight text-primary sm:text-4xl">
                Find a room, start talking
              </h1>
              <p className="mt-3 max-w-2xl text-lg text-on-surface-variant">
                Join a live conversation or open your own. Your AI host listens along and moves the
                group on to a new topic when it&apos;s time.
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
