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

export const useReviewStore = create<ReviewState>((set) => ({
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
    // Backups are no longer deleted upon finishing a review.
    // They are now persisted as part of the project history.
    set({
      changes: [],
      isReviewing: false,
      activeChangeId: null,
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