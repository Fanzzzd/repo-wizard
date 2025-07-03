import { create } from "zustand";
import type { ChangeOperation, ReviewChange } from "../types";
import {
  applyPatch,
  backupFiles,
  deleteFile,
  moveFile,
  revertFileFromBackup,
  writeFileContent,
} from "../lib/tauri_api";
import { useWorkspaceStore } from "./workspaceStore";

/**
 * Updates workspace state after a file operation to prevent stale paths.
 */
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
  } = useWorkspaceStore.getState();
  if (!rootPath) return;

  const getAbsPath = (p: string) => `${rootPath}/${p}`;
  const isApply = direction === "apply";

  if (operation.type === "delete" && isApply) {
    // A file was deleted
    const filePath = getAbsPath(operation.filePath);
    setSelectedFilePaths(selectedFilePaths.filter((p) => p !== filePath));
    if (activeFilePath === filePath) setActiveFilePath(null);
  } else if (operation.type === "move") {
    // A file was moved/renamed
    const from = getAbsPath(isApply ? operation.fromPath : operation.toPath);
    const to = getAbsPath(isApply ? operation.toPath : operation.fromPath);
    const newSelected = selectedFilePaths.map((p) => (p === from ? to : p));
    setSelectedFilePaths(newSelected);
    if (activeFilePath === from) setActiveFilePath(to);
  } else if (operation.type === "modify" && operation.isNewFile && !isApply) {
    // A new file's creation was reverted (i.e., it was deleted)
    const filePath = getAbsPath(operation.filePath);
    setSelectedFilePaths(selectedFilePaths.filter((p) => p !== filePath));
    if (activeFilePath === filePath) setActiveFilePath(null);
  }

  triggerFileTreeRefresh();
};

interface ReviewState {
  changes: ReviewChange[];
  isReviewing: boolean;
  activeChangeId: string | null;
  reviewBackupId: string | null;
  errors: Record<string, string>; // change.id -> error message
  startReview: (changes: ReviewChange[]) => Promise<void>;
  endReview: () => void;
  setActiveChangeId: (id: string | null) => void;
  applyChange: (id: string) => Promise<void>;
  revertChange: (id: string) => Promise<void>;
  applyAllPendingChanges: () => Promise<void>;
  revertAllAppliedChanges: () => Promise<void>;
  setError: (id: string, error: string) => void;
}

export const useReviewStore = create<ReviewState>((set, get) => ({
  changes: [],
  isReviewing: false,
  activeChangeId: null,
  reviewBackupId: null,
  errors: {},

  startReview: async (changes) => {
    const rootPath = useWorkspaceStore.getState().rootPath;
    if (!rootPath) return;

    const filesToBackup = new Set<string>();
    for (const change of changes) {
      const { operation } = change;
      switch (operation.type) {
        case "modify":
          if (!operation.isNewFile) filesToBackup.add(operation.filePath);
          break;
        case "rewrite": // We assume rewrite is on existing files for backup purposes. Backend handles non-existent files.
        case "delete":
          filesToBackup.add(operation.filePath);
          break;
        case "move":
          filesToBackup.add(operation.fromPath);
          break;
      }
    }

    const backupId = await backupFiles(rootPath, Array.from(filesToBackup));

    set({
      changes,
      isReviewing: true,
      activeChangeId: changes[0]?.id ?? null,
      reviewBackupId: backupId,
      errors: {},
    });
  },

  endReview: () => {
    set({
      changes: [],
      isReviewing: false,
      activeChangeId: null,
      reviewBackupId: null,
      errors: {},
    });
  },

  setActiveChangeId: (id) => set({ activeChangeId: id }),

  setError: (id, error) => {
    set((state) => ({
      errors: { ...state.errors, [id]: error },
      changes: state.changes.map((c) =>
        c.id === id ? { ...c, status: "error" } : c
      ),
    }));
  },

  applyChange: async (id) => {
    const { changes } = get();
    const change = changes.find((c) => c.id === id);
    const rootPath = useWorkspaceStore.getState().rootPath;

    if (!change || change.status !== "pending" || !rootPath) return;

    const getAbsPath = (p: string) => `${rootPath}/${p}`;

    try {
      const { operation } = change;
      switch (operation.type) {
        case "modify":
          await applyPatch(getAbsPath(operation.filePath), operation.diff);
          break;
        case "rewrite":
          await writeFileContent(
            getAbsPath(operation.filePath),
            operation.content
          );
          break;
        case "delete":
          await deleteFile(getAbsPath(operation.filePath));
          break;
        case "move":
          await moveFile(
            getAbsPath(operation.fromPath),
            getAbsPath(operation.toPath)
          );
          break;
      }
      set((state) => ({
        changes: state.changes.map((c) =>
          c.id === id ? { ...c, status: "applied" } : c
        ),
      }));
      updateWorkspaceOnFileChange(operation, "apply");
    } catch (e: any) {
      console.error(`Failed to apply change ${id}:`, e);
      get().setError(id, e.toString());
    }
  },

  revertChange: async (id: string) => {
    const { changes, reviewBackupId } = get();
    const change = changes.find((c) => c.id === id);
    const rootPath = useWorkspaceStore.getState().rootPath;

    if (!change || change.status !== "applied" || !rootPath || !reviewBackupId)
      return;

    try {
      const { operation } = change;
      switch (operation.type) {
        case "modify":
        case "rewrite":
          if ("isNewFile" in operation && operation.isNewFile) {
            await deleteFile(`${rootPath}/${operation.filePath}`);
          } else {
            await revertFileFromBackup(
              rootPath,
              reviewBackupId,
              operation.filePath
            );
          }
          break;
        case "delete":
          await revertFileFromBackup(
            rootPath,
            reviewBackupId,
            operation.filePath
          );
          break;
        case "move":
          await moveFile(
            `${rootPath}/${operation.toPath}`,
            `${rootPath}/${operation.fromPath}`
          );
          break;
      }
      set((state) => ({
        changes: state.changes.map((c) =>
          c.id === id ? { ...c, status: "pending" } : c
        ),
      }));
      updateWorkspaceOnFileChange(operation, "revert");
    } catch (e: any) {
      console.error(`Failed to revert change ${id}:`, e);
      // Potentially set a new "revert_error" status or show a dialog
    }
  },

  applyAllPendingChanges: async () => {
    const { changes } = get();
    const pendingChanges = changes.filter((c) => c.status === "pending");
    for (const change of pendingChanges) {
      await get().applyChange(change.id);
    }
  },

  revertAllAppliedChanges: async () => {
    const { changes } = get();
    const appliedChanges = changes.filter((c) => c.status === "applied");
    for (const change of appliedChanges) {
      await get().revertChange(change.id);
    }
  },
}));