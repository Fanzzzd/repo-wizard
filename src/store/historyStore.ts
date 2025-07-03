import { create } from "zustand";
import { persist } from "zustand/middleware";
import { deleteAllBackups, deleteBackup, restoreState } from "../lib/tauri_api";
import type { HistoryState } from "../types";
import { v4 as uuidv4 } from "uuid";

interface HistoryStore {
  history: Record<string, HistoryState[]>; // rootPath -> HistoryState[]
  head: Record<string, number>; // rootPath -> index of the current state
  addState: (entry: Omit<HistoryState, "id" | "timestamp">) => void;
  amendState: (entry: Omit<HistoryState, "id" | "timestamp" | "isInitialState">) => Promise<void>;
  checkout: (rootPath: string, targetIndex: number) => Promise<void>;
  clearAllHistory: () => Promise<void>;
}

export const useHistoryStore = create<HistoryStore>()(
  persist(
    (set, get) => ({
      history: {},
      head: {},

      addState: (partialEntry) => {
        set((state) => {
          const { rootPath } = partialEntry;
          const projectHistory = state.history[rootPath] ?? [];
          const currentHead = state.head[rootPath] ?? -1;

          const baseHistory =
            currentHead === -1
              ? projectHistory
              : projectHistory.slice(0, currentHead + 1);

          const newEntry: HistoryState = {
            ...partialEntry,
            id: uuidv4(),
            timestamp: Date.now(),
          };

          const newProjectHistory = [...baseHistory, newEntry];

          return {
            history: {
              ...state.history,
              [rootPath]: newProjectHistory,
            },
            head: {
              ...state.head,
              [rootPath]: newProjectHistory.length - 1,
            },
          };
        });
      },
      
      amendState: async (partialEntry) => {
        const { rootPath } = partialEntry;
        const { history, head, addState } = get();
        const projectHistory = history[rootPath] ?? [];
        const currentHeadIndex = head[rootPath] ?? -1;

        if (currentHeadIndex === -1) {
          addState(partialEntry);
          return;
        }

        const headState = projectHistory[currentHeadIndex];
        if (headState.backupId) {
          await deleteBackup(headState.backupId);
        }

        set(state => {
          const newProjectHistory = [...state.history[rootPath]];
          const updatedState: HistoryState = {
            ...newProjectHistory[currentHeadIndex],
            ...partialEntry,
            timestamp: Date.now(),
          };
          newProjectHistory[currentHeadIndex] = updatedState;

          return {
            history: {
              ...state.history,
              [rootPath]: newProjectHistory,
            },
          };
        });
      },

      checkout: async (rootPath, targetIndex) => {
        const { history, head } = get();
        const projectHistory = history[rootPath];
        const currentHeadIndex = head[rootPath];

        if (
          !projectHistory ||
          targetIndex < 0 ||
          targetIndex >= projectHistory.length
        ) {
          throw new Error("Invalid checkout index");
        }

        const targetState = projectHistory[targetIndex];
        const currentState = projectHistory[currentHeadIndex];

        if (targetState.id === currentState.id) {
          return; // Already at the target state
        }

        const filesToDelete = currentState.files.filter(
          (file) => !targetState.files.includes(file)
        );

        await restoreState(rootPath, targetState.backupId, filesToDelete);

        set((state) => ({
          head: { ...state.head, [rootPath]: targetIndex },
        }));
      },

      clearAllHistory: async () => {
        await deleteAllBackups();
        set({ history: {}, head: {} });
      },
    }),
    {
      name: "repo-wizard-history",
    }
  )
);