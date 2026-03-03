import { listen } from '@tauri-apps/api/event';
import { Store as TauriStore } from '@tauri-apps/plugin-store';
import { create } from 'zustand';
import type { FileNode } from '../bindings';
import { AppError } from '../lib/error';
import { showErrorDialog } from '../lib/errorHandler';
import * as projectService from '../services/projectService';
import { startWatching, stopWatching } from '../services/tauriApi';
import type { ComposerMode, PromptHistoryEntry } from '../types/prompt';
import { type ComposerState, useComposerStore } from './composerStore';
import {
  buildFileTreeIndex,
  buildSelectedCounts,
  type FileTreeIndex,
  normalizeSelectedPaths,
} from './fileTreeIndex';
import { type HistoryState, useHistoryStore } from './historyStore';
import { useReviewStore } from './reviewStore';
import { useSettingsStore } from './settingsStore';

const getProjectStoreKey = (projectPath: string) => {
  try {
    return `project-${btoa(projectPath)}.json`;
  } catch (_e) {
    return `project-${projectPath.replace(/[^a-zA-Z0-9]/g, '_')}.json`;
  }
};

const shouldLogSelectionTiming = import.meta.env.DEV;
const logSelectionTiming = (
  label: string,
  startTime: number,
  details: Record<string, unknown>
) => {
  if (!shouldLogSelectionTiming) {
    return;
  }
  const durationMs = Math.round((performance.now() - startTime) * 100) / 100;
  console.debug(`[selection] ${label} ${durationMs}ms`, details);
};

interface WorkspaceState {
  rootPath: string | null;
  isInitialized: boolean;
  fileTree: FileNode | null;
  fileIndex: FileTreeIndex | null;
  activeFilePath: string | null;
  selectedFilePaths: string[];
  selectedFilePathSet: Set<string>;
  selectedFilePathIndex: Map<string, number>;
  selectedCountByPath: Map<string, number>;
  refreshCounter: number;

  // Actions
  setRootPath: (rootPath: string) => Promise<void>;
  closeProject: () => Promise<void>;
  loadFileTree: () => Promise<void>;
  setFileTree: (fileTree: FileNode | null) => void;
  setActiveFilePath: (path: string | null) => void;
  setSelectedFilePaths: (paths: string[]) => void;
  addSelectedFilePath: (path: string) => void;
  removeSelectedFilePath: (path: string) => void;
  toggleDirectorySelection: (path: string, isChecked: boolean) => void;
  triggerFileTreeRefresh: () => void;
}

interface PersistedState {
  activeFilePath?: string | null;
  selectedFilePaths?: string[];
  composerMode?: ComposerMode;
  instructions?: string;
  enabledMetaPromptIds?: string[];
  promptHistory?: PromptHistoryEntry[];
}

const initialState: Omit<
  WorkspaceState,
  | 'setRootPath'
  | 'closeProject'
  | 'loadFileTree'
  | 'setFileTree'
  | 'setActiveFilePath'
  | 'setSelectedFilePaths'
  | 'addSelectedFilePath'
  | 'removeSelectedFilePath'
  | 'toggleDirectorySelection'
  | 'triggerFileTreeRefresh'
> = {
  rootPath: null,
  isInitialized: false,
  fileTree: null,
  fileIndex: null,
  activeFilePath: null,
  selectedFilePaths: [],
  selectedFilePathSet: new Set(),
  selectedFilePathIndex: new Map(),
  selectedCountByPath: new Map(),
  refreshCounter: 0,
};

const buildSelectionIndex = (paths: string[]) => {
  const index = new Map<string, number>();
  paths.forEach((path, i) => {
    index.set(path, i);
  });
  return index;
};

const removeFromSelection = (
  paths: string[],
  index: Map<string, number>,
  path: string
) => {
  const idx = index.get(path);
  if (idx === undefined) {
    return;
  }
  const lastIndex = paths.length - 1;
  const lastPath = paths[lastIndex];
  paths[idx] = lastPath;
  paths.pop();
  index.delete(path);
  if (idx !== lastIndex) {
    index.set(lastPath, idx);
  }
};

const updateCountsForPath = (
  counts: Map<string, number>,
  fileIndex: FileTreeIndex | null,
  path: string,
  delta: number
) => {
  if (!fileIndex) {
    return;
  }
  let current: string | null = path;
  while (current) {
    const nextValue = (counts.get(current) ?? 0) + delta;
    if (nextValue <= 0) {
      counts.delete(current);
    } else {
      counts.set(current, nextValue);
    }
    current = fileIndex.parentByPath.get(current) ?? null;
  }
};

let persistenceUnsubscribe: (() => void) | null = null;
let saveTimeout: NodeJS.Timeout | null = null;
let tauriFileWatcherUnlisten: (() => void) | null = null;

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  ...initialState,

  setRootPath: async (rootPath: string) => {
    const oldState = get();
    if (oldState.isInitialized) {
      const { lastReview, sessionBaseBackupId } = useReviewStore.getState();
      if (lastReview?.sessionBaseBackupId) {
        projectService.cleanupBackup(lastReview.sessionBaseBackupId);
      }
      if (sessionBaseBackupId) {
        projectService.cleanupBackup(sessionBaseBackupId);
      }
      if (persistenceUnsubscribe) persistenceUnsubscribe();

      if (tauriFileWatcherUnlisten) {
        tauriFileWatcherUnlisten();
        tauriFileWatcherUnlisten = null;
      }
      if (oldState.rootPath) {
        await stopWatching(oldState.rootPath);
      }
    }

    useComposerStore.getState()._reset();
    useHistoryStore.getState()._reset();
    useReviewStore.getState().clearReviewSession();

    const storeKey = getProjectStoreKey(rootPath);
    const projectTauriStore = await TauriStore.load(storeKey);
    const savedState =
      ((await projectTauriStore.get('state')) as PersistedState) || {};

    const restoredSelected = savedState.selectedFilePaths || [];
    set({
      ...initialState,
      rootPath,
      isInitialized: true,
      activeFilePath: savedState.activeFilePath || null,
      selectedFilePaths: restoredSelected,
      selectedFilePathSet: new Set(restoredSelected),
      selectedFilePathIndex: buildSelectionIndex(restoredSelected),
      selectedCountByPath: new Map(),
    });

    useComposerStore.getState()._load(savedState as Partial<ComposerState>);
    useHistoryStore.getState()._load(savedState as Partial<HistoryState>);

    useSettingsStore.getState().addRecentProject(rootPath);

    persistenceUnsubscribe = useWorkspaceStore.subscribe((state) => {
      if (!state.isInitialized) return;
      if (saveTimeout) clearTimeout(saveTimeout);
      saveTimeout = setTimeout(async () => {
        const { composerMode, instructions, enabledMetaPromptIds } =
          useComposerStore.getState();
        const { promptHistory } = useHistoryStore.getState();
        const stateToSave = {
          activeFilePath: state.activeFilePath,
          selectedFilePaths: state.selectedFilePaths,
          composerMode,
          instructions,
          enabledMetaPromptIds,
          promptHistory,
        };
        await projectTauriStore.set('state', stateToSave);
        await projectTauriStore.save();
      }, 1000);
    });

    try {
      const { respectGitignore, customIgnorePatterns } =
        useSettingsStore.getState();
      const settings = { respectGitignore, customIgnorePatterns };
      await startWatching(rootPath, settings);
      tauriFileWatcherUnlisten = await listen<string>(
        'file-change-event',
        (event) => {
          if (event.payload === get().rootPath) {
            get().triggerFileTreeRefresh();
          }
        }
      );
    } catch (e) {
      showErrorDialog(
        new AppError(`Failed to set up file watcher for ${rootPath}`, e)
      );
    }

    get().loadFileTree();
  },

  closeProject: async () => {
    const oldState = get();
    if (oldState.isInitialized) {
      const { lastReview, sessionBaseBackupId } = useReviewStore.getState();
      if (lastReview?.sessionBaseBackupId) {
        projectService.cleanupBackup(lastReview.sessionBaseBackupId);
      }
      if (sessionBaseBackupId) {
        projectService.cleanupBackup(sessionBaseBackupId);
      }
      if (persistenceUnsubscribe) {
        persistenceUnsubscribe();
        persistenceUnsubscribe = null;
      }
      if (tauriFileWatcherUnlisten) {
        tauriFileWatcherUnlisten();
        tauriFileWatcherUnlisten = null;
      }
      if (oldState.rootPath) {
        await stopWatching(oldState.rootPath);
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
      set({
        fileTree: null,
        fileIndex: null,
        selectedFilePathSet: new Set(),
        selectedFilePathIndex: new Map(),
        selectedCountByPath: new Map(),
      });
      return;
    }

    try {
      const { respectGitignore, customIgnorePatterns } =
        useSettingsStore.getState();
      const settings = { respectGitignore, customIgnorePatterns };
      const fileTree = await projectService.loadFileTree(rootPath, settings);
      const fileIndex = buildFileTreeIndex(fileTree);
      const selectedFilePaths = normalizeSelectedPaths(
        get().selectedFilePaths,
        fileIndex
      );
      set({
        fileTree,
        fileIndex,
        selectedFilePaths,
        selectedFilePathSet: new Set(selectedFilePaths),
        selectedFilePathIndex: buildSelectionIndex(selectedFilePaths),
        selectedCountByPath: buildSelectedCounts(selectedFilePaths, fileIndex),
      });
    } catch (error) {
      showErrorDialog(error);
      set({ fileTree: null, fileIndex: null });
    }
  },

  setFileTree: (fileTree) => {
    if (!fileTree) {
      set({
        fileTree: null,
        fileIndex: null,
        selectedFilePathSet: new Set(),
        selectedFilePathIndex: new Map(),
        selectedCountByPath: new Map(),
      });
      return;
    }

    const fileIndex = buildFileTreeIndex(fileTree);
    const selectedFilePaths = normalizeSelectedPaths(
      get().selectedFilePaths,
      fileIndex
    );
    set({
      fileTree,
      fileIndex,
      selectedFilePaths,
      selectedFilePathSet: new Set(selectedFilePaths),
      selectedFilePathIndex: buildSelectionIndex(selectedFilePaths),
      selectedCountByPath: buildSelectedCounts(selectedFilePaths, fileIndex),
    });
  },
  setActiveFilePath: (path) => set({ activeFilePath: path }),
  setSelectedFilePaths: (paths) => {
    const fileIndex = get().fileIndex;
    const selectedFilePaths = normalizeSelectedPaths(paths, fileIndex);
    set({
      selectedFilePaths,
      selectedFilePathSet: new Set(selectedFilePaths),
      selectedFilePathIndex: buildSelectionIndex(selectedFilePaths),
      selectedCountByPath: buildSelectedCounts(selectedFilePaths, fileIndex),
    });
  },
  addSelectedFilePath: (path) => {
    const startTime = performance.now();
    const {
      fileIndex,
      selectedFilePaths,
      selectedFilePathSet,
      selectedFilePathIndex,
      selectedCountByPath,
    } = get();
    if (!fileIndex || selectedFilePathSet.has(path)) {
      return;
    }

    if (!fileIndex.filePaths.has(path)) {
      return;
    }

    const nextSet = new Set(selectedFilePathSet);
    const nextIndex = new Map(selectedFilePathIndex);
    const nextPaths = [...selectedFilePaths];
    nextSet.add(path);
    nextIndex.set(path, nextPaths.length);
    nextPaths.push(path);
    const nextCounts = new Map(selectedCountByPath);
    updateCountsForPath(nextCounts, fileIndex, path, 1);

    set({
      selectedFilePaths: nextPaths,
      selectedFilePathSet: nextSet,
      selectedFilePathIndex: nextIndex,
      selectedCountByPath: nextCounts,
    });
    logSelectionTiming('add', startTime, {
      path,
      selectedCount: nextPaths.length,
    });
  },
  removeSelectedFilePath: (path) => {
    const startTime = performance.now();
    const {
      fileIndex,
      selectedFilePaths,
      selectedFilePathSet,
      selectedFilePathIndex,
      selectedCountByPath,
    } = get();
    if (!selectedFilePathSet.has(path)) {
      return;
    }

    const nextPaths = [...selectedFilePaths];
    const nextSet = new Set(selectedFilePathSet);
    const nextIndex = new Map(selectedFilePathIndex);
    removeFromSelection(nextPaths, nextIndex, path);
    nextSet.delete(path);
    const nextCounts = new Map(selectedCountByPath);
    updateCountsForPath(nextCounts, fileIndex, path, -1);
    set({
      selectedFilePaths: nextPaths,
      selectedFilePathSet: nextSet,
      selectedFilePathIndex: nextIndex,
      selectedCountByPath: nextCounts,
    });
    logSelectionTiming('remove', startTime, {
      path,
      selectedCount: nextPaths.length,
    });
  },
  toggleDirectorySelection: (path, isChecked) => {
    const startTime = performance.now();
    const {
      fileIndex,
      selectedFilePaths,
      selectedFilePathSet,
      selectedFilePathIndex,
      selectedCountByPath,
    } = get();
    if (!fileIndex) {
      return;
    }
    const descendantLeaves = fileIndex.descendantLeavesByPath.get(path) ?? [];

    if (descendantLeaves.length === 0) {
      return;
    }

    const nextSet = new Set(selectedFilePathSet);
    const nextIndex = new Map(selectedFilePathIndex);
    const nextCounts = new Map(selectedCountByPath);
    const nextPaths = [...selectedFilePaths];
    if (isChecked) {
      for (const leafPath of descendantLeaves) {
        if (!nextSet.has(leafPath)) {
          nextSet.add(leafPath);
          nextIndex.set(leafPath, nextPaths.length);
          nextPaths.push(leafPath);
          updateCountsForPath(nextCounts, fileIndex, leafPath, 1);
        }
      }
    } else {
      for (const leafPath of descendantLeaves) {
        if (nextSet.delete(leafPath)) {
          removeFromSelection(nextPaths, nextIndex, leafPath);
          updateCountsForPath(nextCounts, fileIndex, leafPath, -1);
        }
      }
    }
    set({
      selectedFilePaths: nextPaths,
      selectedFilePathSet: nextSet,
      selectedFilePathIndex: nextIndex,
      selectedCountByPath: nextCounts,
    });
    logSelectionTiming('toggle-directory', startTime, {
      path,
      isChecked,
      selectedCount: nextPaths.length,
      descendantCount: descendantLeaves.length,
    });
  },
  triggerFileTreeRefresh: () =>
    set((state) => ({ refreshCounter: state.refreshCounter + 1 })),
}));
