import { create } from "zustand";
import { persist } from "zustand/middleware";
import { restoreFromBackup, deleteAllBackups } from "../lib/tauri_api";

export interface HistoryEntry {
  backupId: string;
  timestamp: number;
  description: string;
  rootPath: string;
  newFilePaths: string[];
}

interface HistoryState {
  entries: HistoryEntry[];
  addEntry: (entry: Omit<HistoryEntry, "timestamp">) => void;
  restore: (
    backupId: string,
    rootPath: string,
    newFilePaths: string[]
  ) => Promise<void>;
  clearAllHistory: () => Promise<void>;
}

export const useHistoryStore = create<HistoryState>()(
  persist(
    (set) => ({
      entries: [],
      addEntry: (entry) => {
        const newEntry: HistoryEntry = { ...entry, timestamp: Date.now() };
        set((state) => ({ entries: [newEntry, ...state.entries] }));
      },
      restore: async (backupId, rootPath, newFilePaths) => {
        await restoreFromBackup(rootPath, backupId, newFilePaths);
      },
      clearAllHistory: async () => {
        await deleteAllBackups();
        set({ entries: [] });
      },
    }),
    {
      name: "repo-wizard-history",
    }
  )
);