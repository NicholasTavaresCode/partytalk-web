"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/components/auth/AuthProvider";
import { ApiError } from "@/lib/apiClient";
import { roomsApi } from "@/lib/api/rooms";
import { usersApi } from "@/lib/api/users";
import type { CreateRoomInput, UpsertProfile } from "@/lib/types";

export const queryKeys = {
  me: ["me"] as const,
  rooms: ["rooms"] as const,
  room: (id: string) => ["rooms", id] as const,
  transcript: (id: string) => ["rooms", id, "transcript"] as const,
  suggestions: (id: string) => ["rooms", id, "suggestions"] as const,
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
  const invalidate = () => qc.invalidateQueries({ queryKey: queryKeys.room(id) });
  return {
    join: useMutation({ mutationFn: () => roomsApi.join(id), onSuccess: invalidate }),
    leave: useMutation({ mutationFn: () => roomsApi.leave(id), onSuccess: invalidate }),
    start: useMutation({ mutationFn: () => roomsApi.start(id), onSuccess: invalidate }),
    end: useMutation({ mutationFn: () => roomsApi.end(id), onSuccess: invalidate }),
    suggest: useMutation({ mutationFn: () => roomsApi.suggestTopic(id) }),
  };
}
