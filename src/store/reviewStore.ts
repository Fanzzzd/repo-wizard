import { create } from "zustand";
import type { ReviewChange } from "../types";
import { deleteBackup } from "../lib/tauri_api";

interface ReviewState {
  changes: ReviewChange[];
  isReviewing: boolean;
  activeChangeId: string | null;
  backupId: string | null;
  setChanges: (changes: ReviewChange[]) => void;
  updateChangeStatus: (id: string, status: ReviewChange["status"]) => void;
  startReview: (changes: ReviewChange[]) => void;
  endReview: () => void;
  setActiveChangeId: (id: string | null) => void;
  setBackupId: (id: string | null) => void;
}

export const useReviewStore = create<ReviewState>((set, get) => ({
  changes: [],
  isReviewing: false,
  activeChangeId: null,
  backupId: null,
  setChanges: (changes) => set({ changes }),
  updateChangeStatus: (id, status) =>
    set((state) => ({
      changes: state.changes.map((change) =>
        change.id === id ? { ...change, status } : change
      ),
    })),
  startReview: (changes) =>
    set({
      changes,
      isReviewing: true,
      activeChangeId: changes[0]?.id ?? null,
      backupId: null,
    }),
  endReview: () => {
    const { backupId } = get();
    if (backupId) {
      deleteBackup(backupId).catch(console.error);
    }
    set({
      changes: [],
      isReviewing: false,
      activeChangeId: null,
      backupId: null,
    });
  },
  setActiveChangeId: (id) => set({ activeChangeId: id }),
  setBackupId: (id) => set({ backupId: id }),
}));