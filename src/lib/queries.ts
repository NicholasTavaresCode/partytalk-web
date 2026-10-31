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

/* --------------------------------- Rooms -------------------------------- */

/** Replace `room` in a cached list (or leave the list alone if it isn't there). */
export function replaceRoomInList(rooms: Room[] | undefined, room: Room): Room[] | undefined {
  if (!rooms) return rooms;
  return rooms.some((r) => r.id === room.id) ? rooms.map((r) => (r.id === room.id ? room : r)) : rooms;
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
      qc.setQueryData(queryKeys.room(room.id), room);
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
    join: useMutation({ mutationFn: () => roomsApi.join(id), onSuccess: applyRoom }),
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
