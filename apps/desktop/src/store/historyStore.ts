import { create } from 'zustand';
import type { PromptHistoryEntry } from '../types/prompt';
import { useSettingsStore } from './settingsStore';

export interface HistoryState {
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
  | 'addPromptToHistory'
  | 'clearPromptHistory'
  | 'updatePromptHistoryEntry'
  | '_load'
  | '_reset'
> = {
  promptHistory: [],
};

export const useHistoryStore = create<HistoryState>((set) => ({
  ...initialState,
  addPromptToHistory: (instructions: string) => {
    if (!instructions.trim()) return;

    const { promptHistoryLimit } = useSettingsStore.getState();

    set((state) => {
      const history = [...state.promptHistory];
      const existingIndex = history.findIndex(
        (p) => p.instructions === instructions
      );

      if (existingIndex > -1) {
        const [entryToMove] = history.splice(existingIndex, 1);
        entryToMove.timestamp = Date.now();
        history.unshift(entryToMove);
      } else {
        history.unshift({
          id: window.crypto.randomUUID(),
          timestamp: Date.now(),
          instructions,
        });
      }

      return {
        promptHistory: history.slice(0, promptHistoryLimit),
      };
    });
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
