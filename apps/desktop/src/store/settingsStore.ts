import { Store as TauriStore } from '@tauri-apps/plugin-store';
import { create } from 'zustand';
import type { EditFormat, MetaPromptDefinition } from '../types';

const SETTINGS_FILE = 'app-settings.json';

const defaultSystemPrompt = `Act as an expert software developer.
Always use best practices when coding.
Respect and use existing conventions, libraries, etc that are already present in the code base.

Take requests for changes to the supplied code.
If the request is ambiguous, ask questions.
`;

interface SettingsState {
  // Store state
  respectGitignore: boolean;
  customIgnorePatterns: string;
  customSystemPrompt: string;
  editFormat: EditFormat;
  metaPrompts: MetaPromptDefinition[];
  autoReviewOnPaste: boolean;
  recentProjects: string[];
  promptHistoryLimit: number;
  enableClipboardReview: boolean;
  showPasteResponseArea: boolean;

  // Actions
  setRespectGitignore: (value: boolean) => void;
  setCustomIgnorePatterns: (value: string) => void;
  setCustomSystemPrompt: (prompt: string) => void;
  setEditFormat: (format: EditFormat) => void;
  setMetaPrompts: (prompts: MetaPromptDefinition[]) => void;
  setAutoReviewOnPaste: (value: boolean) => void;
  addRecentProject: (path: string) => void;
  removeRecentProject: (path: string) => void;
  setPromptHistoryLimit: (limit: number) => void;
  setEnableClipboardReview: (value: boolean) => void;
  setShowPasteResponseArea: (value: boolean) => void;

  // Internal
  _isInitialized: boolean;
  _hasHydrated: boolean;
  _init: () => Promise<void>;
}

let tauriStoreInstance: TauriStore | null = null;
const getTauriStore = async (): Promise<TauriStore> => {
  if (tauriStoreInstance === null) {
    tauriStoreInstance = await TauriStore.load(SETTINGS_FILE);
  }
  return tauriStoreInstance;
};

export const useSettingsStore = create<SettingsState>((set, get) => {
  const initialState = {
    respectGitignore: true,
    customIgnorePatterns: '.git',
    customSystemPrompt: defaultSystemPrompt,
    editFormat: 'whole' as EditFormat,
    metaPrompts: [] as MetaPromptDefinition[],
    autoReviewOnPaste: true,
    recentProjects: [] as string[],
    promptHistoryLimit: 50,
    enableClipboardReview: true,
    showPasteResponseArea: true,
  };

  let saveTimeout: NodeJS.Timeout | null = null;
  const debouncedSave = (state: SettingsState) => {
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(async () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { _isInitialized, _hasHydrated, _init, ...stateToSave } = state;
      const store = await getTauriStore();
      await store.set('state', stateToSave);
      await store.save();
    }, 500);
  };

  return {
    ...initialState,
    _isInitialized: false,
    _hasHydrated: false,

    _init: async () => {
      if (get()._isInitialized) return;

      const store = await getTauriStore();
      const savedState = await store.get<Partial<SettingsState>>('state');

      if (savedState) {
        if (
          savedState.recentProjects &&
          !Array.isArray(savedState.recentProjects)
        ) {
          savedState.recentProjects = [];
        }
        set(savedState);
      }

      set({ _isInitialized: true, _hasHydrated: true });

      useSettingsStore.subscribe((state) => {
        if (state._hasHydrated) {
          debouncedSave(state);
        }
      });
    },

    setRespectGitignore: (value) => set({ respectGitignore: value }),
    setCustomIgnorePatterns: (value) => set({ customIgnorePatterns: value }),
    setCustomSystemPrompt: (prompt) => set({ customSystemPrompt: prompt }),
    setEditFormat: (format) => set({ editFormat: format }),
    setMetaPrompts: (prompts) => set({ metaPrompts: prompts }),
    setAutoReviewOnPaste: (value) => set({ autoReviewOnPaste: value }),
    setPromptHistoryLimit: (limit) => set({ promptHistoryLimit: limit }),
    setEnableClipboardReview: (value) => set({ enableClipboardReview: value }),
    setShowPasteResponseArea: (value) => set({ showPasteResponseArea: value }),
    addRecentProject: (path) =>
      set((state) => {
        const otherProjects = state.recentProjects.filter((p) => p !== path);
        const newRecentProjects = [path, ...otherProjects].slice(0, 20); // Keep last 20
        return { recentProjects: newRecentProjects };
      }),
    removeRecentProject: (path) =>
      set((state) => ({
        recentProjects: state.recentProjects.filter((p) => p !== path),
      })),
  };
});

useSettingsStore.getState()._init();
