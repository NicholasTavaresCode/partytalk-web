import type { Metadata } from "next";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { ProfileGate } from "@/components/profile/ProfileGate";
import { AppHeader } from "@/components/app/AppHeader";
import { Container } from "@/components/ui/Container";
import { SideQuestBoard } from "@/components/quests/SideQuestBoard";

export const metadata: Metadata = {
  title: "Side quests",
  description: "Your personal English goals, set by our AI host after each room.",
};

export default function QuestsPage() {
  return (
    <RequireAuth>
      <ProfileGate>
        <div className="min-h-screen bg-surface">
          <AppHeader />
          <section className="relative isolate border-b border-ink/10">
            <div aria-hidden className="bg-dots pointer-events-none absolute inset-0 -z-10" />
            <Container className="py-10">
              <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink sm:text-5xl">
                Your side{" "}
                <span className="inline-block -rotate-1 rounded-xl border-2 border-ink bg-lime px-2 shadow-pop-sm">
                  quests.
                </span>
              </h1>
              <p className="mt-3 max-w-2xl text-lg text-on-surface-variant">
                Small habits our AI host picked for you from how you spoke in your rooms. They work in any
                conversation, whatever the topic. When it hears you&apos;ve got one, it checks it off.
              </p>
            </Container>
          </section>

          <section className="py-10">
            <Container>
              <SideQuestBoard />
            </Container>
          </section>
        </div>
      </ProfileGate>
    </RequireAuth>
  );
}
