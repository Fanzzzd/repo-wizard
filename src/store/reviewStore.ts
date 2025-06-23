import { create } from "zustand";
import type { ReviewChange } from "../types";

interface ReviewState {
  changes: ReviewChange[];
  isReviewing: boolean;
  activeChangeId: string | null;
  setChanges: (changes: ReviewChange[]) => void;
  updateChangeStatus: (id: string, status: ReviewChange["status"]) => void;
  startReview: (changes: ReviewChange[]) => void;
  endReview: () => void;
  setActiveChangeId: (id: string | null) => void;
  approveAllChanges: () => void;
  discardAllChanges: () => void;
}

export const useReviewStore = create<ReviewState>((set, get) => ({
  changes: [],
  isReviewing: false,
  activeChangeId: null,
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
    }),
  endReview: () => {
    const { activeChangeId } = get();
    // If the active change is part of the review that's ending, clear it.
    const changeIds = new Set(get().changes.map(c => c.id));
    const shouldClearActive = activeChangeId && changeIds.has(activeChangeId);

    set({
      changes: [],
      isReviewing: false,
      activeChangeId: shouldClearActive ? null : activeChangeId,
    });
  },
  setActiveChangeId: (id) => set({ activeChangeId: id }),
  approveAllChanges: () =>
    set((state) => ({
      changes: state.changes.map((change) => ({
        ...change,
        status: "approved",
      })),
    })),
  discardAllChanges: () =>
    set((state) => ({
      changes: state.changes.map((change) => ({
        ...change,
        status: "discarded",
      })),
    })),
}));