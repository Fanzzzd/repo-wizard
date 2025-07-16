import { create } from "zustand";
import { Store as TauriStore } from "@tauri-apps/plugin-store";
import type { FileNode } from "../types";
import { useSettingsStore } from "./settingsStore";
import { useComposerStore } from "./composerStore";
import { useHistoryStore } from "./historyStore";
import { useReviewStore } from "./reviewStore";
import * as projectService from "../services/projectService";
import { showErrorDialog } from "../lib/errorHandler";
import { watch } from "@tauri-apps/plugin-fs";
import { AppError } from "../lib/error";

const getProjectStoreKey = (projectPath: string) => {
  try {
    return `project-${btoa(projectPath)}.json`;
  } catch (e) {
    return `project-${projectPath.replace(/[^a-zA-Z0-9]/g, "_")}.json`;
  }
};

interface WorkspaceState {
  rootPath: string | null;
  isInitialized: boolean;
  fileTree: FileNode | null;
  activeFilePath: string | null;
  selectedFilePaths: string[];
  refreshCounter: number;

  // Actions
  setRootPath: (rootPath: string) => Promise<void>;
  closeProject: () => void;
  loadFileTree: () => Promise<void>;
  setFileTree: (fileTree: FileNode | null) => void;
  setActiveFilePath: (path: string | null) => void;
  setSelectedFilePaths: (paths: string[]) => void;
  addSelectedFilePath: (path: string) => void;
  removeSelectedFilePath: (path: string) => void;
  triggerFileTreeRefresh: () => void;
}

const initialState: Omit<WorkspaceState, "setRootPath" | "closeProject" | "loadFileTree" | "setFileTree" | "setActiveFilePath" | "setSelectedFilePaths" | "addSelectedFilePath" | "removeSelectedFilePath" | "triggerFileTreeRefresh"> = {
  rootPath: null,
  isInitialized: false,
  fileTree: null,
  activeFilePath: null,
  selectedFilePaths: [],
  refreshCounter: 0,
};

let persistenceUnsubscribe: (() => void) | null = null;
let saveTimeout: NodeJS.Timeout | null = null;
let fileWatcherUnlisten: (() => void) | null = null;
let refreshTimeout: NodeJS.Timeout | null = null;

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  ...initialState,

  setRootPath: async (rootPath: string) => {
    const oldState = get();
    if (oldState.isInitialized) {
      const { lastReview, sessionBaseBackupId } = useReviewStore.getState();
      if (lastReview?.sessionBaseBackupId) { projectService.cleanupBackup(lastReview.sessionBaseBackupId); }
      if (sessionBaseBackupId) { projectService.cleanupBackup(sessionBaseBackupId); }
      if (persistenceUnsubscribe) persistenceUnsubscribe();
      if (fileWatcherUnlisten) {
        fileWatcherUnlisten();
        fileWatcherUnlisten = null;
      }
    }

    useComposerStore.getState()._reset();
    useHistoryStore.getState()._reset();
    useReviewStore.getState().clearReviewSession();

    const storeKey = getProjectStoreKey(rootPath);
    const projectTauriStore = await TauriStore.load(storeKey);
    const savedState = (await projectTauriStore.get<any>("state")) || {};

    set({
      ...initialState,
      rootPath,
      isInitialized: true,
      activeFilePath: savedState.activeFilePath || null,
      selectedFilePaths: savedState.selectedFilePaths || [],
    });

    useComposerStore.getState()._load(savedState);
    useHistoryStore.getState()._load(savedState);
    useSettingsStore.getState().addRecentProject(rootPath);

    persistenceUnsubscribe = useWorkspaceStore.subscribe((state) => {
      if (!state.isInitialized) return;
      if (saveTimeout) clearTimeout(saveTimeout);
      saveTimeout = setTimeout(async () => {
        const { composerMode, instructions, enabledMetaPromptIds } = useComposerStore.getState();
        const { promptHistory } = useHistoryStore.getState();
        const stateToSave = {
          activeFilePath: state.activeFilePath,
          selectedFilePaths: state.selectedFilePaths,
          composerMode,
          instructions,
          enabledMetaPromptIds,
          promptHistory,
        };
        await projectTauriStore.set("state", stateToSave);
        await projectTauriStore.save();
      }, 1000);
    });

    try {
      fileWatcherUnlisten = await watch(
        rootPath,
        () => {
          if (refreshTimeout) clearTimeout(refreshTimeout);
          refreshTimeout = setTimeout(() => {
            get().triggerFileTreeRefresh();
          }, 300);
        },
        { recursive: true }
      );
    } catch (e) {
      showErrorDialog(
        new AppError(`Failed to set up file watcher for ${rootPath}`, e)
      );
    }

    get().loadFileTree();
  },

  closeProject: () => {
    const oldState = get();
    if (oldState.isInitialized) {
      const { lastReview, sessionBaseBackupId } = useReviewStore.getState();
      if (lastReview?.sessionBaseBackupId) { projectService.cleanupBackup(lastReview.sessionBaseBackupId); }
      if (sessionBaseBackupId) { projectService.cleanupBackup(sessionBaseBackupId); }
      if (persistenceUnsubscribe) {
        persistenceUnsubscribe();
        persistenceUnsubscribe = null;
      }
      if (fileWatcherUnlisten) {
        fileWatcherUnlisten();
        fileWatcherUnlisten = null;
      }
    }
    useComposerStore.getState()._reset();
    useHistoryStore.getState()._reset();
    useReviewStore.getState().clearReviewSession();
    set(initialState);
  },

  loadFileTree: async () => {
    const { rootPath } = get();
    if (!rootPath) {
      set({ fileTree: null });
      return;
    }
    try {
      const { respectGitignore, customIgnorePatterns } = useSettingsStore.getState();
      const settings = { respectGitignore, customIgnorePatterns };
      const fileTree = await projectService.loadFileTree(rootPath, settings);
      set({ fileTree });
    } catch (error) {
      showErrorDialog(error);
      set({ fileTree: null });
    }
  },

  setFileTree: (fileTree) => set({ fileTree }),
  setActiveFilePath: (path) => set({ activeFilePath: path }),
  setSelectedFilePaths: (paths) => set({ selectedFilePaths: paths }),
  addSelectedFilePath: (path) =>
    set((state) => ({ selectedFilePaths: [...new Set([...state.selectedFilePaths, path])] })),
  removeSelectedFilePath: (path) =>
    set((state) => ({ selectedFilePaths: state.selectedFilePaths.filter((p) => p !== path) })),
  triggerFileTreeRefresh: () =>
    set((state) => ({ refreshCounter: state.refreshCounter + 1 })),
}));