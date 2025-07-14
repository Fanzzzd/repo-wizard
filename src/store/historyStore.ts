import { create } from "zustand";
import type { PromptHistoryEntry } from "../types";

interface HistoryState {
  promptHistory: PromptHistoryEntry[];
  addPromptToHistory: (instructions: string) => void;
  clearPromptHistory: () => void;
  updatePromptHistoryEntry: (id: string, newInstructions: string) => void;

  // For persistence
  _load: (state: Partial<HistoryState>) => void;
  _reset: () => void;
}

const initialState: Omit<
  HistoryState,
  | "addPromptToHistory"
  | "clearPromptHistory"
  | "updatePromptHistoryEntry"
  | "_load"
  | "_reset"
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
  updatePromptHistoryEntry: (id, newInstructions) => {
    set((state) => ({
      promptHistory: state.promptHistory.map((entry) =>
        entry.id === id ? { ...entry, instructions: newInstructions } : entry
      ),
    }));
  },

  _load: (state) => set(state),
  _reset: () => set(initialState),
}));