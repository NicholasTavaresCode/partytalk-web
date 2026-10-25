import type { Metadata } from "next";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { ProfileGate } from "@/components/profile/ProfileGate";
import { RoomExperience } from "@/components/practice/room/RoomExperience";

export const metadata: Metadata = {
  title: "Live room",
};

export default async function RoomPage({
  params,
  searchParams,
}: {
  params: Promise<{ roomId: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { roomId } = await params;
  // `?invite=<code>` comes from the owner's shareable invite link.
  const { invite } = await searchParams;
  return (
    <RequireAuth>
      <ProfileGate>
        <RoomExperience roomId={roomId} inviteCode={typeof invite === "string" ? invite : undefined} />
      </ProfileGate>
    </RequireAuth>
  );
}
