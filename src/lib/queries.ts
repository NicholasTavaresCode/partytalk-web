"use client";

import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/components/auth/AuthProvider";
import { ApiError } from "@/lib/apiClient";
import { roomsApi } from "@/lib/api/rooms";
import { usersApi } from "@/lib/api/users";
import type { CreateRoomInput, Room, UpsertProfile } from "@/lib/types";

export const queryKeys = {
  me: ["me"] as const,
  rooms: ["rooms"] as const,
  room: (id: string) => ["rooms", id] as const,
  transcript: (id: string) => ["rooms", id, "transcript"] as const,
  hostMessages: (id: string) => ["rooms", id, "host-messages"] as const,
  sideQuests: ["me", "side-quests"] as const,
  /** Past rooms, kept apart from `rooms` (the open list that REST and socket updates merge into). */
  endedRooms: ["ended-rooms"] as const,
};

/* --------------------------------- Users -------------------------------- */

/** Returns the profile, `null` if it doesn't exist yet (first sign-in), or throws. */
export function useMe() {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.me,
    enabled: !!user,
    queryFn: async () => {
      try {
        return await usersApi.me();
      } catch (e) {
        if (e instanceof ApiError && e.status === 404) return null;
        throw e;
      }
    },
    // A 403 means "not on the allow-list" — retrying won't change it.
    retry: (count, e) => !(e instanceof ApiError && e.status === 403) && count < 1,
  });
}

export function useUpsertProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpsertProfile) => usersApi.upsert(input),
    onSuccess: (u) => qc.setQueryData(queryKeys.me, u),
  });
}

/**
 * The signed-in learner's side quests. Refetched on every mount: the host
 * changes them whenever a room ends, so a cached copy is usually stale.
 */
export function useSideQuests() {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.sideQuests,
    enabled: !!user,
    queryFn: () => usersApi.sideQuests(),
    refetchOnMount: "always",
  });
}

/* --------------------------------- Rooms -------------------------------- */

/**
 * Lay an incoming Room over the cached one. `roomUpdated` carries the non-owner
 * view (no `invitedEmails` / `inviteCode`), so replacing outright would wipe the
 * owner's invite state; fields that are present always win.
 */
export function mergeRoom(prev: Room | undefined, room: Room): Room {
  return prev ? { ...prev, ...room } : room;
}

/** Merge `room` into a cached list (or leave the list alone if it isn't there). */
export function replaceRoomInList(rooms: Room[] | undefined, room: Room): Room[] | undefined {
  if (!rooms) return rooms;
  return rooms.some((r) => r.id === room.id) ? rooms.map((r) => (r.id === room.id ? mergeRoom(r, room) : r)) : rooms;
}

/**
 * Apply a full Room to the cache. A Room reaches the client two ways — the REST
 * response to the user's own action, and the `roomUpdated` socket event to
 * everyone else — and both go through here so they behave identically.
 */
export function useApplyRoom() {
  const qc = useQueryClient();
  return useCallback(
    (room: Room) => {
      qc.setQueryData<Room>(queryKeys.room(room.id), (prev) => mergeRoom(prev, room));
      qc.setQueryData<Room[]>(queryKeys.rooms, (rooms) => replaceRoomInList(rooms, room));
    },
    [qc],
  );
}

export function useRooms() {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.rooms,
    enabled: !!user,
    queryFn: () => roomsApi.list(50),
    refetchInterval: 15_000,
  });
}

/**
 * Rooms that have ended (newest first), for the Ended filter; loaded only while
 * it's shown, and refetched each time, since rooms end while you're elsewhere.
 */
export function useEndedRooms(enabled: boolean) {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.endedRooms,
    enabled: !!user && enabled,
    queryFn: () => roomsApi.list(50, "ended"),
    refetchOnMount: "always",
  });
}

export function useRoom(id: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.room(id),
    enabled: !!user && !!id,
    queryFn: () => roomsApi.get(id),
    // 403 (not invited) / 404 are answers, not glitches — don't retry them.
    retry: (count, e) => !(e instanceof ApiError && (e.status === 403 || e.status === 404)) && count < 1,
  });
}

export function useCreateRoom() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateRoomInput) => roomsApi.create(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.rooms }),
  });
}

/** Owner + participant lifecycle mutations for a single room. */
export function useRoomLifecycle(id: string) {
  const qc = useQueryClient();
  const applyRoom = useApplyRoom();
  const invalidate = () => qc.invalidateQueries({ queryKey: queryKeys.room(id) });
  return {
    /** `inviteCode` (from an invite link) admits a caller who isn't invited yet. */
    join: useMutation({ mutationFn: (inviteCode?: string) => roomsApi.join(id, inviteCode), onSuccess: applyRoom }),
    leave: useMutation({ mutationFn: () => roomsApi.leave(id), onSuccess: applyRoom }),
    start: useMutation({
      mutationFn: () => roomsApi.start(id),
      onSuccess: applyRoom,
      // 409: the room is no longer `waiting` (someone started it, or it ended) — catch up.
      onError: (e) => {
        if (e instanceof ApiError && e.status === 409) void invalidate();
      },
    }),
    end: useMutation({ mutationFn: () => roomsApi.end(id), onSuccess: applyRoom }),
    changeTopic: useMutation({ mutationFn: () => roomsApi.changeTopic(id) }),
  };
}

/**
 * Accept an invitation from the room list: take a seat (`POST /rooms/:id/join`,
 * the same call the room page makes). The returned room goes through
 * `useApplyRoom`, so the card moves from Invitations to Your rooms by itself.
 */
export function useAcceptInvite() {
  const qc = useQueryClient();
  const applyRoom = useApplyRoom();
  return useMutation({
    mutationFn: (roomId: string) => roomsApi.join(roomId),
    onSuccess: applyRoom,
    // 409 full/ended or 403 withdrawn: the list is out of date, so catch up.
    onError: () => qc.invalidateQueries({ queryKey: queryKeys.rooms }),
  });
}

/** Owner-only invite management; each call returns the room with its full invite state. */
export function useRoomInvites(id: string) {
  const applyRoom = useApplyRoom();
  return {
    add: useMutation({ mutationFn: (emails: string[]) => roomsApi.addInvites(id, emails), onSuccess: applyRoom }),
    revoke: useMutation({ mutationFn: (email: string) => roomsApi.revokeInvite(id, email), onSuccess: applyRoom }),
    createLink: useMutation({ mutationFn: () => roomsApi.createInviteLink(id), onSuccess: applyRoom }),
    disableLink: useMutation({ mutationFn: () => roomsApi.disableInviteLink(id), onSuccess: applyRoom }),
  };
}
