import { create } from "zustand";
import type { PromptHistoryEntry } from "../types";

interface HistoryState {
  promptHistory: PromptHistoryEntry[];
  addPromptToHistory: (instructions: string) => void;
  clearPromptHistory: () => void;

  // For persistence
  _load: (state: Partial<HistoryState>) => void;
  _reset: () => void;
}

const initialState: Omit<
  HistoryState,
  "addPromptToHistory" | "clearPromptHistory" | "_load" | "_reset"
> = {
  promptHistory: [],
};

export const useHistoryStore = create<HistoryState>((set) => ({
  ...initialState,
  addPromptToHistory: (instructions: string) => {
    if (!instructions.trim()) return;
    set((state) => ({
      promptHistory: [
        {
          id: window.crypto.randomUUID(),
          timestamp: Date.now(),
          instructions,
        },
        ...state.promptHistory,
      ].slice(0, 50),
    }));
  },
  clearPromptHistory: () => set({ promptHistory: [] }),

  _load: (state) => set(state),
  _reset: () => set(initialState),
}));