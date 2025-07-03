import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useReviewStore } from "./reviewStore";

interface PromptState {
  instructions: string;
  markdownResponse: string;
  processedMarkdownResponse: string | null; // Track what's been reviewed
  setInstructions: (instructions: string) => void;
  setMarkdownResponse: (response: string) => void;
  markMarkdownAsProcessed: () => void;
}

export const usePromptStore = create<PromptState>()(
  persist(
    (set) => ({
      instructions: "",
      markdownResponse: "",
      processedMarkdownResponse: null,
      setInstructions: (instructions) => set({ instructions }),
      setMarkdownResponse: (response) => {
        useReviewStore.getState().clearReviewSession();
        set({ markdownResponse: response });
      },
      markMarkdownAsProcessed: () =>
        set((state) => ({ processedMarkdownResponse: state.markdownResponse })),
    }),
    {
      name: "repo-wizard-prompt",
      partialize: (state) => ({
        // Only persist instructions, not transient review-related state.
        instructions: state.instructions,
      }),
    }
  )
);