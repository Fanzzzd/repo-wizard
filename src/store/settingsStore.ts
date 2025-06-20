import { create } from "zustand";
import { persist } from "zustand/middleware";

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
  setRespectGitignore: (value: boolean) => void;
  setCustomIgnorePatterns: (value: string) => void;
  setCustomSystemPrompt: (prompt: string) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      respectGitignore: true,
      customIgnorePatterns: "",
      customSystemPrompt: defaultSystemPrompt,
      setRespectGitignore: (value) => set({ respectGitignore: value }),
      setCustomIgnorePatterns: (value) => set({ customIgnorePatterns: value }),
      setCustomSystemPrompt: (prompt) => set({ customSystemPrompt: prompt }),
    }),
    {
      name: "repo-wizard-settings",
    }
  )
);