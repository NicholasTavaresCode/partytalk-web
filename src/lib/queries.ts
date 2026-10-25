"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/components/auth/AuthProvider";
import { ApiError } from "@/lib/apiClient";
import { roomsApi } from "@/lib/api/rooms";
import { usersApi } from "@/lib/api/users";
import type { CreateRoomInput, Room, UpsertProfile } from "@/lib/types";
import {
  IELTS_MODULES,
  LISTENING_TEST,
  READING_TEST,
  SPEAKING_TEST,
  WRITING_TASKS,
  fetchIeltsModules,
  fetchListeningTest,
  fetchReadingTest,
  fetchSpeakingTest,
  fetchWritingTasks,
} from "@/lib/api/ielts";

export const queryKeys = {
  me: ["me"] as const,
  rooms: ["rooms"] as const,
  room: (id: string) => ["rooms", id] as const,
  transcript: (id: string) => ["rooms", id, "transcript"] as const,
  suggestions: (id: string) => ["rooms", id, "suggestions"] as const,
  ieltsModules: ["ielts", "modules"] as const,
  listening: ["ielts", "listening"] as const,
  reading: ["ielts", "reading"] as const,
  writing: ["ielts", "writing"] as const,
  speaking: ["ielts", "speaking"] as const,
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
  const invalidate = () => qc.invalidateQueries({ queryKey: queryKeys.room(id) });
  return {
    join: useMutation({
      mutationFn: (inviteCode?: string) => roomsApi.join(id, inviteCode),
      onSuccess: invalidate,
    }),
    leave: useMutation({ mutationFn: () => roomsApi.leave(id), onSuccess: invalidate }),
    start: useMutation({ mutationFn: () => roomsApi.start(id), onSuccess: invalidate }),
    end: useMutation({ mutationFn: () => roomsApi.end(id), onSuccess: invalidate }),
    suggest: useMutation({ mutationFn: () => roomsApi.suggestTopic(id) }),
  };
}

/** Owner-only invite management; each call returns the updated room, cached directly. */
export function useRoomInvites(id: string) {
  const qc = useQueryClient();
  const store = (room: Room) => qc.setQueryData(queryKeys.room(id), room);
  return {
    add: useMutation({ mutationFn: (emails: string[]) => roomsApi.addInvites(id, emails), onSuccess: store }),
    revoke: useMutation({ mutationFn: (email: string) => roomsApi.revokeInvite(id, email), onSuccess: store }),
    createLink: useMutation({ mutationFn: () => roomsApi.createInviteLink(id), onSuccess: store }),
    disableLink: useMutation({ mutationFn: () => roomsApi.disableInviteLink(id), onSuccess: store }),
  };
}

/* -------------------------- IELTS (parked, mock) ------------------------- */

export function useIeltsModules() {
  return useQuery({
    queryKey: queryKeys.ieltsModules,
    queryFn: fetchIeltsModules,
    initialData: IELTS_MODULES,
  });
}
export function useListeningTest() {
  return useQuery({
    queryKey: queryKeys.listening,
    queryFn: fetchListeningTest,
    initialData: LISTENING_TEST,
  });
}
export function useReadingTest() {
  return useQuery({
    queryKey: queryKeys.reading,
    queryFn: fetchReadingTest,
    initialData: READING_TEST,
  });
}
export function useWritingTasks() {
  return useQuery({
    queryKey: queryKeys.writing,
    queryFn: fetchWritingTasks,
    initialData: WRITING_TASKS,
  });
}
export function useSpeakingTest() {
  return useQuery({
    queryKey: queryKeys.speaking,
    queryFn: fetchSpeakingTest,
    initialData: SPEAKING_TEST,
  });
}
