import { create } from "zustand";
import { persist } from "zustand/middleware";
import { v4 as uuidv4 } from "uuid";

export interface PromptHistoryEntry {
  id: string;
  timestamp: number;
  instructions: string;
}

interface PromptHistoryState {
  prompts: PromptHistoryEntry[];
  addPrompt: (instructions: string) => void;
  clearHistory: () => void;
}

export const usePromptHistoryStore = create<PromptHistoryState>()(
  persist(
    (set) => ({
      prompts: [],
      addPrompt: (instructions) => {
        if (!instructions.trim()) return;
        set((state) => ({
          prompts: [
            { id: uuidv4(), timestamp: Date.now(), instructions },
            ...state.prompts,
          ],
        }));
      },
      clearHistory: () => set({ prompts: [] }),
    }),
    {
      name: "repo-wizard-prompt-history",
    }
  )
);