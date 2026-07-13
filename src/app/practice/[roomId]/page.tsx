import type { Metadata } from "next";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { ProfileGate } from "@/components/profile/ProfileGate";
import { RoomExperience } from "@/components/practice/room/RoomExperience";

export const metadata: Metadata = {
  title: "Live room",
};

export default async function RoomPage({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const { roomId } = await params;
  return (
    <RequireAuth>
      <ProfileGate>
        <RoomExperience roomId={roomId} />
      </ProfileGate>
    </RequireAuth>
  );
}
