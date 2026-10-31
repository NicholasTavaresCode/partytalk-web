import type { QuestSkill, SideQuest } from "./types";

export const SKILL_LABEL: Record<QuestSkill, string> = {
  grammar: "Grammar",
  vocabulary: "Vocabulary",
  fluency: "Fluency",
  interaction: "Interaction",
};

/** Open and completed quests, each keeping the API's order (newest first). */
export function splitQuests(quests: SideQuest[]): { open: SideQuest[]; done: SideQuest[] } {
  return {
    open: quests.filter((q) => q.status === "open"),
    done: quests.filter((q) => q.status === "done"),
  };
}

/** What one room changed for this learner: quests it added, and quests it checked off. */
export function roomQuestChanges(
  quests: SideQuest[],
  roomId: string,
): { added: SideQuest[]; completed: SideQuest[] } {
  return {
    added: quests.filter((q) => q.createdInRoomId === roomId),
    completed: quests.filter((q) => q.status === "done" && q.doneInRoomId === roomId),
  };
}
