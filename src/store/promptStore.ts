import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useReviewStore } from "./reviewStore";

interface PromptState {
  composerMode: "edit" | "qa";
  instructions: string;
  markdownResponse: string;
  processedMarkdownResponse: string | null; // Track what's been reviewed
  setComposerMode: (mode: "edit" | "qa") => void;
  setInstructions: (instructions: string) => void;
  setMarkdownResponse: (response: string) => void;
  markMarkdownAsProcessed: () => void;
}

export const usePromptStore = create<PromptState>()(
  persist(
    (set) => ({
      composerMode: "edit",
      instructions: "",
      markdownResponse: "",
      processedMarkdownResponse: null,
      setComposerMode: (mode) => set({ composerMode: mode }),
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
        // Persist instructions and composer mode
        instructions: state.instructions,
        composerMode: state.composerMode,
      }),
    }
  )
);