import { create } from "zustand";
import { persist } from "zustand/middleware";

interface PromptState {
  instructions: string;
  markdownResponse: string;
  setInstructions: (instructions: string) => void;
  setMarkdownResponse: (response: string) => void;
}

export const usePromptStore = create<PromptState>()(
  persist(
    (set) => ({
      instructions: "",
      markdownResponse: "",
      setInstructions: (instructions) => set({ instructions }),
      setMarkdownResponse: (markdownResponse) => set({ markdownResponse }),
    }),
    {
      name: "repo-wizard-prompt",
      partialize: (state) => ({
        // Only persist instructions, not the transient markdown response.
        instructions: state.instructions,
      }),
    }
  )
);