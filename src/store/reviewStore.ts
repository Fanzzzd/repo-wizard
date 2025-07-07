import { create } from "zustand";
import type { ChangeOperation, ReviewChange } from "../types";
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
import { useWorkspaceStore } from "./workspaceStore";
import { applyPatch as applyJsPatch } from "diff";

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
    addSelectedFilePath,
    removeSelectedFilePath,
  } = useWorkspaceStore.getState();
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
  } else if (isCreateOperation && !isApply) {
    // A new file's creation was reverted (i.e., it was deleted)
    const filePath = getAbsPath(operation.filePath);
    removeSelectedFilePath(filePath);
    if (activeFilePath === filePath) setActiveFilePath(null);
  }

  triggerFileTreeRefresh();
};

interface LastReview {
  changes: ReviewChange[];
  sessionBaseBackupId: string | null;
}

interface ReviewState {
  changes: ReviewChange[];
  isReviewing: boolean;
  activeChangeId: string | null;
  sessionBaseBackupId: string | null;
  errors: Record<string, string>;
  lastReview: LastReview | null;
  startReview: (changes: ReviewChange[]) => Promise<void>;
  endReview: () => void;
  reenterReview: () => void;
  clearReviewSession: () => void;
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
  sessionBaseBackupId: null,
  errors: {},
  lastReview: null,

  startReview: async (initialChanges) => {
    // Clean up backup from the previous review session, if it exists.
    const { lastReview } = get();
    if (lastReview?.sessionBaseBackupId) {
      deleteBackup(lastReview.sessionBaseBackupId).catch((e) =>
        console.error(
          `Failed to delete obsolete backup ${lastReview.sessionBaseBackupId}`,
          e
        )
      );
    }
    
    const rootPath = useWorkspaceStore.getState().rootPath;
    if (!rootPath) return;

    // 1. Create a session-specific backup
    const filesToSnapshot = new Set<string>();
    initialChanges.forEach(({ operation }) => {
      switch (operation.type) {
        case "modify":
        case "rewrite":
        case "delete":
          filesToSnapshot.add(operation.filePath);
          break;
        case "move":
          filesToSnapshot.add(operation.fromPath);
          break;
      }
    });

    const fileList = Array.from(filesToSnapshot).filter((p) => p);
    let sessionBaseBackupId: string;
    try {
      sessionBaseBackupId = await backupFiles(rootPath, fileList);
      set({ sessionBaseBackupId });
    } catch (err) {
      console.error("Failed to create session backup:", err);
      return; // Abort review
    }

    // 2. Process changes, determining `isNewFile` and `identical` status
    //    based on the new backup. This is the source of truth for the session.
    const changes = await Promise.all(
      initialChanges.map(async (change): Promise<ReviewChange> => {
        const { operation } = change;

        const getBaseFileContent = async (filePath: string) => {
          try {
            return await readFileFromBackup(sessionBaseBackupId, filePath);
          } catch (e) {
            return null;
          }
        };

        if (operation.type === "modify" || operation.type === "rewrite") {
          const originalContent = await getBaseFileContent(operation.filePath);
          // The source of truth for `isNewFile` is whether it existed in the session backup.
          const isNewFile = originalContent === null;

          const updatedOperation = { ...operation, isNewFile };
          let updatedChange = { ...change, operation: updatedOperation };

          if (!isNewFile) {
            // File existed, check if it's identical
            if (updatedOperation.type === "modify") {
              try {
                const modifiedContent = applyJsPatch(
                  originalContent!,
                  updatedOperation.diff
                );
                if (
                  modifiedContent !== false &&
                  originalContent === modifiedContent
                ) {
                  updatedChange = { ...updatedChange, status: "identical" };
                }
              } catch (e) {
                /* ignore patch errors, it just won't be identical */
              }
            } else if (updatedOperation.type === "rewrite") {
              if (originalContent === updatedOperation.content) {
                updatedChange = { ...updatedChange, status: "identical" };
              }
            }
          }
          return updatedChange;
        }
        return change;
      })
    );

    set({
      changes,
      isReviewing: true,
      activeChangeId:
        changes.find((c) => c.status === "pending")?.id ??
        changes[0]?.id ??
        null,
      errors: {},
      lastReview: null,
    });
  },

  endReview: () => {
    const { sessionBaseBackupId, changes } = get();
    const wasAnythingApplied = changes.some((c) => c.status === "applied");

    // Only clean up the backup if no changes were applied.
    // Otherwise, it's preserved for the 'lastReview' session.
    if (sessionBaseBackupId && !wasAnythingApplied) {
      deleteBackup(sessionBaseBackupId).catch((e) =>
        console.error(`Failed to delete session backup ${sessionBaseBackupId}`, e)
      );
    }

    set((state) => ({
      isReviewing: false,
      lastReview: wasAnythingApplied
        ? {
            changes: state.changes,
            sessionBaseBackupId: state.sessionBaseBackupId,
          }
        : null,
      changes: [],
      activeChangeId: null,
      sessionBaseBackupId: null,
      errors: {},
    }));
  },

  reenterReview: () => {
    set((state) => {
      if (!state.lastReview) return state;
      const { changes, sessionBaseBackupId } = state.lastReview;
      return {
        isReviewing: true,
        changes,
        sessionBaseBackupId,
        activeChangeId:
          changes.find((c) => c.status !== "identical")?.id ??
          changes[0]?.id ??
          null,
        lastReview: null,
      };
    });
  },

  clearReviewSession: () => set({ sessionBaseBackupId: null }),

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
    const { changes, sessionBaseBackupId } = get();
    const change = changes.find((c) => c.id === id);
    const rootPath = useWorkspaceStore.getState().rootPath;

    if (
      !change ||
      change.status !== "applied" ||
      !rootPath ||
      !sessionBaseBackupId
    )
      return;

    try {
      const { operation } = change;
      switch (operation.type) {
        case "modify":
        case "rewrite":
          if (operation.isNewFile) {
            // If the file was new, reverting means deleting it.
            await deleteFile(`${rootPath}/${operation.filePath}`);
          } else {
            // If the file existed, revert it from the backup.
            await revertFileFromBackup(
              rootPath,
              sessionBaseBackupId,
              operation.filePath
            );
          }
          break;
        case "delete":
          // Reverting a delete means restoring the file from backup.
          await revertFileFromBackup(
            rootPath,
            sessionBaseBackupId,
            operation.filePath
          );
          break;
        case "move":
          // Reverting a move means moving it back.
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
    const appliedChanges = [...changes]
      .reverse()
      .filter((c) => c.status === "applied");
    for (const change of appliedChanges) {
      await get().revertChange(change.id);
    }
  },
}));