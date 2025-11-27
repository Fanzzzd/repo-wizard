import { Store as TauriStore } from '@tauri-apps/plugin-store';
import { temporal } from 'zundo';
import { create } from 'zustand';
import type { EditFormat, MetaPromptDefinition } from '../types/prompt';
import type { AppSettings } from '../types/settings';

const SETTINGS_FILE = 'app-settings.json';

const defaultSystemPrompt = `Act as an expert software developer.
Always use best practices when coding.
Respect and use existing conventions, libraries, etc that are already present in the code base.

Take requests for changes to the supplied code.
If the request is ambiguous, ask questions.
`;

const defaultSettings: AppSettings = {
  respectGitignore: true,
  customIgnorePatterns: '.git',
  customSystemPrompt: defaultSystemPrompt,
  editFormat: 'whole',
  metaPrompts: [],
  autoReviewOnPaste: true,
  recentProjects: [],
  promptHistoryLimit: 50,
  enableClipboardReview: true,
  showPasteResponseArea: true,
  theme: 'system',
  autoContext: {
    enabled: false,
    provider: 'openai-compatible',
    apiKey: '',
    baseUrl: '',
    model: '',
  },
};

interface SettingsState extends AppSettings {
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
  setAutoContext: (settings: Partial<AppSettings['autoContext']>) => void;

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

export const useSettingsStore = create<SettingsState>()(
  temporal(
    (set, get) => {
      const initialState = defaultSettings;

      let saveTimeout: NodeJS.Timeout | null = null;
      const debouncedSave = (state: SettingsState) => {
        if (saveTimeout) clearTimeout(saveTimeout);
        saveTimeout = setTimeout(async () => {
          const stateToSave = {
            respectGitignore: state.respectGitignore,
            customIgnorePatterns: state.customIgnorePatterns,
            customSystemPrompt: state.customSystemPrompt,
            editFormat: state.editFormat,
            metaPrompts: state.metaPrompts,
            autoReviewOnPaste: state.autoReviewOnPaste,
            recentProjects: state.recentProjects,
            promptHistoryLimit: state.promptHistoryLimit,
            enableClipboardReview: state.enableClipboardReview,
            showPasteResponseArea: state.showPasteResponseArea,
            theme: state.theme,
            autoContext: state.autoContext,
          };
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
          const rawState = (await store.get(
            'state'
          )) as Partial<AppSettings> | null;

          const stateToLoad: AppSettings = {
            ...defaultSettings,
            ...(rawState || {}),
          };

          // Ensure metaPrompts is an array if corrupted
          if (!Array.isArray(stateToLoad.metaPrompts)) {
            stateToLoad.metaPrompts = [];
          }

          set({ ...stateToLoad, _isInitialized: true, _hasHydrated: true });

          // Clear history so we don't undo back to empty state
          useSettingsStore.temporal.getState().clear();

          useSettingsStore.subscribe((state) => {
            if (state._hasHydrated) {
              debouncedSave(state);
            }
          });
        },

        setRespectGitignore: (value) => set({ respectGitignore: value }),
        setCustomIgnorePatterns: (value) =>
          set({ customIgnorePatterns: value }),
        setCustomSystemPrompt: (prompt) => set({ customSystemPrompt: prompt }),
        setEditFormat: (format) => set({ editFormat: format }),
        setMetaPrompts: (prompts) => set({ metaPrompts: prompts }),
        setAutoReviewOnPaste: (value) => set({ autoReviewOnPaste: value }),
        setPromptHistoryLimit: (limit) => set({ promptHistoryLimit: limit }),
        setEnableClipboardReview: (value) =>
          set({ enableClipboardReview: value }),
        setShowPasteResponseArea: (value) =>
          set({ showPasteResponseArea: value }),
        addRecentProject: (path) =>
          set((state) => {
            const otherProjects = state.recentProjects.filter(
              (p) => p !== path
            );
            const newRecentProjects = [path, ...otherProjects].slice(0, 20); // Keep last 20
            return { recentProjects: newRecentProjects };
          }),
        removeRecentProject: (path) =>
          set((state) => ({
            recentProjects: state.recentProjects.filter((p) => p !== path),
          })),
        setAutoContext: (settings) =>
          set((state) => ({
            autoContext: { ...state.autoContext, ...settings },
          })),
      };
    },
    {
      partialize: (state) => ({ metaPrompts: state.metaPrompts }),
      limit: 50,
    }
  )
);

useSettingsStore.getState()._init();
