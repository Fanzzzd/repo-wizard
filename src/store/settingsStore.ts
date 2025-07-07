import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { EditFormat, MetaPrompt } from "../types";

const defaultSystemPrompt = `Act as an expert software developer.
Always use best practices when coding.
Respect and use existing conventions, libraries, etc that are already present in the code base.

Take requests for changes to the supplied code.
If the request is ambiguous, ask questions.
`;

interface SettingsState {
  respectGitignore: boolean;
  customIgnorePatterns: string;
  customSystemPrompt: string;
  editFormat: EditFormat;
  metaPrompts: MetaPrompt[];
  autoReviewOnPaste: boolean;
  setRespectGitignore: (value: boolean) => void;
  setCustomIgnorePatterns: (value: string) => void;
  setCustomSystemPrompt: (prompt: string) => void;
  setEditFormat: (format: EditFormat) => void;
  setMetaPrompts: (prompts: MetaPrompt[]) => void;
  setAutoReviewOnPaste: (value: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      respectGitignore: true,
      customIgnorePatterns: "",
      customSystemPrompt: defaultSystemPrompt,
      editFormat: "whole",
      metaPrompts: [],
      autoReviewOnPaste: true,
      setRespectGitignore: (value) => set({ respectGitignore: value }),
      setCustomIgnorePatterns: (value) => set({ customIgnorePatterns: value }),
      setCustomSystemPrompt: (prompt) => set({ customSystemPrompt: prompt }),
      setEditFormat: (format) => set({ editFormat: format }),
      setMetaPrompts: (prompts) => set({ metaPrompts: prompts }),
      setAutoReviewOnPaste: (value) => set({ autoReviewOnPaste: value }),
    }),
    {
      name: "repo-wizard-settings",
      version: 1, // Add versioning for migration
      migrate: (persistedState: unknown, version: number) => {
        if (version < 1) {
          const state = persistedState as any;
          if (state && state.metaPrompts) {
            // Migrate old meta prompts to include the 'mode' property
            state.metaPrompts = state.metaPrompts.map((p: any) => ({
              ...p,
              mode: p.mode ?? "edit",
            }));
          }
        }
        return persistedState as SettingsState;
      },
    }
  )
);