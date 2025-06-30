import { create } from "zustand";

interface PromptState {
  instructions: string;
  setInstructions: (instructions: string) => void;
  markdownResponse: string;
  setMarkdownResponse: (markdown: string) => void;
}

export const usePromptStore = create<PromptState>((set) => ({
  instructions: "",
  setInstructions: (instructions) => set({ instructions }),
  markdownResponse: "",
  setMarkdownResponse: (markdown) => set({ markdownResponse: markdown }),
}));