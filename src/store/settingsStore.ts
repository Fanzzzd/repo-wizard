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
  setRespectGitignore: (value: boolean) => void;
  setCustomIgnorePatterns: (value: string) => void;
  setCustomSystemPrompt: (prompt: string) => void;
  setEditFormat: (format: EditFormat) => void;
  setMetaPrompts: (prompts: MetaPrompt[]) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      respectGitignore: true,
      customIgnorePatterns: "",
      customSystemPrompt: defaultSystemPrompt,
      editFormat: "udiff",
      metaPrompts: [],
      setRespectGitignore: (value) => set({ respectGitignore: value }),
      setCustomIgnorePatterns: (value) => set({ customIgnorePatterns: value }),
      setCustomSystemPrompt: (prompt) => set({ customSystemPrompt: prompt }),
      setEditFormat: (format) => set({ editFormat: format }),
      setMetaPrompts: (prompts) => set({ metaPrompts: prompts }),
    }),
    {
      name: "repo-wizard-settings",
    }
  )
);