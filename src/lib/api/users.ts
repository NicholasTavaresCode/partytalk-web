import { api } from "@/lib/apiClient";
import type { SideQuest, UpsertProfile, User } from "@/lib/types";

export const usersApi = {
  me: () => api.get<User>("/users/me"),
  upsert: (input: UpsertProfile) => api.put<User>("/users/me", input),
  remove: () => api.del<void>("/users/me"),
  /** Open quests first, then completed ones; both newest first. */
  sideQuests: () => api.get<SideQuest[]>("/users/me/side-quests"),
};
