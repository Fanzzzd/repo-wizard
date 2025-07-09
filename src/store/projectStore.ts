import { create } from "zustand";
import { Store as TauriStore } from "@tauri-apps/plugin-store";
import type {
  ChangeOperation,
  FileNode,
  PromptHistoryEntry,
  ReviewChange,
} from "../types";
import {
  applyPatch,
  backupFiles,
  deleteFile,
  deleteBackup,
  moveFile,
  readFileFromBackup,
  revertFileFromBackup,
  writeFileContent,
} from "../lib/tauri_api";
import { applyPatch as applyJsPatch } from "diff";
import { useSettingsStore } from "./settingsStore";

const getProjectStoreKey = (projectPath: string) => {
  try {
    return `project-${btoa(projectPath)}.json`;
  } catch (e) {
    return `project-${projectPath.replace(/[^a-zA-Z0-9]/g, "_")}.json`;
  }
};

interface WorkspaceSubState {
  fileTree: FileNode | null;
  activeFilePath: string | null;
  selectedFilePaths: string[];
  refreshCounter: number;
}

interface PromptSubState {
  composerMode: "edit" | "qa";
  instructions: string;
  markdownResponse: string;
  processedMarkdownResponse: string | null;
  enabledMetaPromptIds: string[];
}

interface HistorySubState {
  promptHistory: PromptHistoryEntry[];
}

interface ReviewSubState {
  changes: ReviewChange[];
  isReviewing: boolean;
  activeChangeId: string | null;
  sessionBaseBackupId: string | null;
  errors: Record<string, string>;
  lastReview: {
    changes: ReviewChange[];
    sessionBaseBackupId: string | null;
  } | null;
}

interface ProjectState
  extends WorkspaceSubState,
    PromptSubState,
    HistorySubState,
    ReviewSubState {
  rootPath: string | null;
  isInitialized: boolean;

  // Actions
  setRootPath: (rootPath: string) => Promise<void>;
  closeProject: () => void;
  setFileTree: (fileTree: FileNode | null) => void;
  setActiveFilePath: (path: string | null) => void;
  setSelectedFilePaths: (paths: string[]) => void;
  addSelectedFilePath: (path: string) => void;
  removeSelectedFilePath: (path: string) => void;
  triggerFileTreeRefresh: () => void;
  setComposerMode: (mode: "edit" | "qa") => void;
  setInstructions: (instructions: string) => void;
  setMarkdownResponse: (response: string) => void;
  markMarkdownAsProcessed: () => void;
  setEnabledMetaPromptIds: (ids: string[]) => void;
  addPromptToHistory: (instructions: string) => void;
  clearPromptHistory: () => void;
  startReview: (changes: ReviewChange[]) => Promise<void>;
  endReview: () => void;
  reenterReview: () => void;
  clearReviewSession: () => void;
  setActiveChangeId: (id: string | null) => void;
  applyChange: (id: string) => Promise<void>;
  revertChange: (id: string) => Promise<void>;
  applyAllPendingChanges: () => Promise<void>;
  revertAllAppliedChanges: () => Promise<void>;
}

const initialProjectState: Omit<
  ProjectState,
  "setRootPath" | "closeProject" | keyof ReturnType<typeof createActions>
> & { rootPath: null; isInitialized: false } = {
  fileTree: null,
  activeFilePath: null,
  selectedFilePaths: [],
  refreshCounter: 0,
  composerMode: "edit",
  instructions: "",
  markdownResponse: "",
  processedMarkdownResponse: null,
  enabledMetaPromptIds: [],
  promptHistory: [],
  changes: [],
  isReviewing: false,
  activeChangeId: null,
  sessionBaseBackupId: null,
  errors: {},
  lastReview: null,
  rootPath: null,
  isInitialized: false,
};

const createActions = (set: (fn: (state: ProjectState) => ProjectState) => void, get: () => ProjectState) => {
  const updateWorkspaceOnFileChange = (
    operation: ChangeOperation,
    direction: "apply" | "revert"
  ) => {
    const {
      rootPath,
      selectedFilePaths,
      activeFilePath,
      setSelectedFilePaths,
      setActiveFilePath,
      triggerFileTreeRefresh,
      addSelectedFilePath,
      removeSelectedFilePath,
    } = get();
    if (!rootPath) return;

    const getAbsPath = (p: string) => `${rootPath}/${p}`;
    const isApply = direction === "apply";

    const isCreateOperation =
      (operation.type === "modify" || operation.type === "rewrite") &&
      operation.isNewFile;

    if (isCreateOperation && isApply) {
      addSelectedFilePath(getAbsPath(operation.filePath));
    }

    if (operation.type === "delete" && isApply) {
      const filePath = getAbsPath(operation.filePath);
      setSelectedFilePaths(selectedFilePaths.filter((p) => p !== filePath));
      if (activeFilePath === filePath) setActiveFilePath(null);
    } else if (operation.type === "move") {
      const from = getAbsPath(isApply ? operation.fromPath : operation.toPath);
      const to = getAbsPath(isApply ? operation.toPath : operation.fromPath);
      const newSelected = selectedFilePaths.map((p) => (p === from ? to : p));
      setSelectedFilePaths(newSelected);
      if (activeFilePath === from) setActiveFilePath(to);
    } else if (isCreateOperation && !isApply) {
      const filePath = getAbsPath(operation.filePath);
      removeSelectedFilePath(filePath);
      if (activeFilePath === filePath) setActiveFilePath(null);
    }

    triggerFileTreeRefresh();
  };

  const setError = (id: string, error: string) => {
    set((state) => ({
        ...state,
      errors: { ...state.errors, [id]: error },
      changes: state.changes.map((c) =>
        c.id === id ? { ...c, status: "error" } : c
      ),
    }));
  };

  return {
    setFileTree: (fileTree: FileNode | null) => set((s) => ({ ...s, fileTree })),
    setActiveFilePath: (path: string | null) => set(s => ({ ...s, activeFilePath: path })),
    setSelectedFilePaths: (paths: string[]) => set(s => ({ ...s, selectedFilePaths: paths })),
    addSelectedFilePath: (path: string) =>
      set((state) => ({ ...state, selectedFilePaths: [...new Set([...state.selectedFilePaths, path])] })),
    removeSelectedFilePath: (path: string) =>
      set((state) => ({ ...state, selectedFilePaths: state.selectedFilePaths.filter((p) => p !== path) })),
    triggerFileTreeRefresh: () =>
      set((state) => ({ ...state, refreshCounter: state.refreshCounter + 1 })),
    setComposerMode: (mode: "edit" | "qa") => set(s => ({ ...s, composerMode: mode })),
    setInstructions: (instructions: string) => set(s => ({ ...s, instructions })),
    setMarkdownResponse: (response: string) => {
      get().clearReviewSession();
      set(s => ({ ...s, markdownResponse: response }));
    },
    markMarkdownAsProcessed: () =>
      set((state) => ({ ...state, processedMarkdownResponse: state.markdownResponse })),
    setEnabledMetaPromptIds: (ids: string[]) => set(s => ({ ...s, enabledMetaPromptIds: ids })),
    addPromptToHistory: (instructions: string) => {
      if (!instructions.trim()) return;
      set((state) => ({ ...state,
        promptHistory: [
          { id: window.crypto.randomUUID(), timestamp: Date.now(), instructions },
          ...state.promptHistory,
        ].slice(0, 50),
      }));
    },
    clearPromptHistory: () => set(s => ({...s, promptHistory: [] })),
    startReview: async (initialChanges: ReviewChange[]) => {
      const { lastReview, rootPath } = get();
      if (lastReview?.sessionBaseBackupId) {
        deleteBackup(lastReview.sessionBaseBackupId).catch(console.error);
      }
      if (!rootPath) return;

      const filesToSnapshot = new Set<string>();
      initialChanges.forEach(({ operation }) => {
        switch (operation.type) {
          case "modify": case "rewrite": case "delete": filesToSnapshot.add(operation.filePath); break;
          case "move": filesToSnapshot.add(operation.fromPath); break;
        }
      });

      const fileList = Array.from(filesToSnapshot).filter((p) => p);
      const sessionBaseBackupId = await backupFiles(rootPath, fileList);

      const changes = await Promise.all(
        initialChanges.map(async (change): Promise<ReviewChange> => {
          const { operation } = change;
          const getBaseFileContent = async (filePath: string) => {
            try { return await readFileFromBackup(sessionBaseBackupId, filePath); }
            catch (e) { return null; }
          };

          if (operation.type === "modify" || operation.type === "rewrite") {
            const originalContent = await getBaseFileContent(operation.filePath);
            const isNewFile = originalContent === null;
            const updatedOperation = { ...operation, isNewFile };
            let updatedChange = { ...change, operation: updatedOperation };

            if (!isNewFile) {
              if (updatedOperation.type === "modify") {
                try {
                  const modifiedContent = applyJsPatch(originalContent!, updatedOperation.diff);
                  if (modifiedContent !== false && originalContent === modifiedContent) {
                    updatedChange = { ...updatedChange, status: "identical" };
                  }
                } catch (e) { /* ignore */ }
              } else if (updatedOperation.type === "rewrite" && originalContent === updatedOperation.content) {
                updatedChange = { ...updatedChange, status: "identical" };
              }
            }
            return updatedChange;
          }
          return change;
        })
      );
      set(s => ({ ...s, changes, isReviewing: true, activeChangeId: changes.find(c => c.status === "pending")?.id ?? changes[0]?.id ?? null, errors: {}, lastReview: null, sessionBaseBackupId }));
    },
    endReview: () => {
      const { sessionBaseBackupId, changes } = get();
      const wasAnythingApplied = changes.some((c) => c.status === "applied");
      if (sessionBaseBackupId && !wasAnythingApplied) {
        deleteBackup(sessionBaseBackupId).catch(console.error);
      }
      set((state) => ({ ...state, isReviewing: false, lastReview: wasAnythingApplied ? { changes: state.changes, sessionBaseBackupId: state.sessionBaseBackupId } : null, changes: [], activeChangeId: null, sessionBaseBackupId: null, errors: {} }));
    },
    reenterReview: () => {
      set((state) => {
        if (!state.lastReview) return state;
        const { changes, sessionBaseBackupId } = state.lastReview;
        return { ...state, isReviewing: true, changes, sessionBaseBackupId, activeChangeId: changes.find(c => c.status !== "identical")?.id ?? changes[0]?.id ?? null, lastReview: null };
      });
    },
    clearReviewSession: () => set(s => ({ ...s, sessionBaseBackupId: null })),
    setActiveChangeId: (id: string | null) => set(s => ({ ...s, activeChangeId: id })),
    applyChange: async (id: string) => {
      const { changes, rootPath } = get();
      const change = changes.find((c) => c.id === id);
      if (!change || change.status !== "pending" || !rootPath) return;
      const getAbsPath = (p: string) => `${rootPath}/${p}`;
      try {
        const { operation } = change;
        switch (operation.type) {
          case "modify": await applyPatch(getAbsPath(operation.filePath), operation.diff); break;
          case "rewrite": await writeFileContent(getAbsPath(operation.filePath), operation.content); break;
          case "delete": await deleteFile(getAbsPath(operation.filePath)); break;
          case "move": await moveFile(getAbsPath(operation.fromPath), getAbsPath(operation.toPath)); break;
        }
        set((state) => ({ ...state, changes: state.changes.map((c) => c.id === id ? { ...c, status: "applied" } : c) }));
        updateWorkspaceOnFileChange(operation, "apply");
      } catch (e: any) {
        setError(id, e.toString());
      }
    },
    revertChange: async (id: string) => {
      const { changes, sessionBaseBackupId, rootPath } = get();
      const change = changes.find((c) => c.id === id);
      if (!change || change.status !== "applied" || !rootPath || !sessionBaseBackupId) return;
      try {
        const { operation } = change;
        switch (operation.type) {
          case "modify":
          case "rewrite":
            if (operation.isNewFile) await deleteFile(`${rootPath}/${operation.filePath}`);
            else await revertFileFromBackup(rootPath, sessionBaseBackupId, operation.filePath);
            break;
          case "delete": await revertFileFromBackup(rootPath, sessionBaseBackupId, operation.filePath); break;
          case "move": await moveFile(`${rootPath}/${operation.toPath}`, `${rootPath}/${operation.fromPath}`); break;
        }
        set((state) => ({ ...state, changes: state.changes.map((c) => c.id === id ? { ...c, status: "pending" } : c) }));
        updateWorkspaceOnFileChange(operation, "revert");
      } catch (e: any) {
        console.error(`Failed to revert change ${id}:`, e);
      }
    },
    applyAllPendingChanges: async () => {
      const { changes, applyChange } = get();
      for (const change of changes.filter((c) => c.status === "pending")) {
        await applyChange(change.id);
      }
    },
    revertAllAppliedChanges: async () => {
      const { changes, revertChange } = get();
      for (const change of [...changes].reverse().filter((c) => c.status === "applied")) {
        await revertChange(change.id);
      }
    },
  };
};

export const useProjectStore = create<ProjectState>((set, get) => {
  let persistenceUnsubscribe: (() => void) | null = null;
  let saveTimeout: NodeJS.Timeout | null = null;

  return {
    ...initialProjectState,
    ...createActions(set as any, get),

    setRootPath: async (rootPath: string) => {
      const oldState = get();
      if (oldState.isInitialized) {
        if (oldState.lastReview?.sessionBaseBackupId) { deleteBackup(oldState.lastReview.sessionBaseBackupId).catch(console.error); }
        if (oldState.sessionBaseBackupId) { deleteBackup(oldState.sessionBaseBackupId).catch(console.error); }
        if (persistenceUnsubscribe) persistenceUnsubscribe();
      }

      const storeKey = getProjectStoreKey(rootPath);
      const projectTauriStore = await TauriStore.load(storeKey);
      const savedState = await projectTauriStore.get<any>("state");

      set({ ...initialProjectState, ...(savedState || {}), rootPath, isInitialized: true });
      useSettingsStore.getState().addRecentProject(rootPath);

      persistenceUnsubscribe = useProjectStore.subscribe((state) => {
        if (!state.isInitialized) return;
        if (saveTimeout) clearTimeout(saveTimeout);
        saveTimeout = setTimeout(async () => {
          const stateToSave = {
            activeFilePath: state.activeFilePath,
            selectedFilePaths: state.selectedFilePaths,
            composerMode: state.composerMode,
            instructions: state.instructions,
            enabledMetaPromptIds: state.enabledMetaPromptIds,
            promptHistory: state.promptHistory,
          };
          await projectTauriStore.set("state", stateToSave);
          await projectTauriStore.save();
        }, 1000);
      });
    },

    closeProject: () => {
      const oldState = get();
      if (oldState.isInitialized) {
        if (oldState.lastReview?.sessionBaseBackupId) { deleteBackup(oldState.lastReview.sessionBaseBackupId).catch(console.error); }
        if (oldState.sessionBaseBackupId) { deleteBackup(oldState.sessionBaseBackupId).catch(console.error); }
        if (persistenceUnsubscribe) {
          persistenceUnsubscribe();
          persistenceUnsubscribe = null;
        }
      }
      set(initialProjectState);
    },
  };
});