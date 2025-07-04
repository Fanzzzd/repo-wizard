import { create } from "zustand";
import type { ChangeOperation, ReviewChange } from "../types";
import {
  applyPatch,
  backupFiles,
  deleteFile,
  moveFile,
  revertFileFromBackup,
  writeFileContent,
  readFileFromBackup,
} from "../lib/tauri_api";
import { useWorkspaceStore } from "./workspaceStore";
import { useHistoryStore } from "./historyStore";
import { applyPatch as applyJsPatch } from "diff";
import { usePromptStore } from "./promptStore";

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
    const rootPath = useWorkspaceStore.getState().rootPath;
    if (!rootPath) return;

    const { history, head, addState } = useHistoryStore.getState();
    let projectHistory = history[rootPath] ?? [];
    let headIndex = head[rootPath] ?? -1;

    if (projectHistory.length === 0) {
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

      const fileList = Array.from(filesToSnapshot).filter(p => p);

      try {
        const backupId = await backupFiles(rootPath, fileList);
        addState({
          backupId,
          description: "Initial project state",
          rootPath,
          changedFiles: [],
          files: fileList,
          isInitialState: true,
        });

        // Re-fetch state after update
        projectHistory = useHistoryStore.getState().history[rootPath];
        headIndex = useHistoryStore.getState().head[rootPath];
      } catch (err) {
        console.error("Failed to create initial history state:", err);
        return; // Abort review
      }
    }

    const headSnapshot = headIndex !== -1 ? projectHistory[headIndex] : null;

    let baseBackupId = get().sessionBaseBackupId;
    if (!baseBackupId) {
        baseBackupId = headSnapshot?.backupId ?? null;
        if (baseBackupId) {
            set({ sessionBaseBackupId: baseBackupId });
        } else {
            console.error("Could not establish a base snapshot for the review session.");
            return;
        }
    }
    
    const changes = await Promise.all(
      initialChanges.map(async (change): Promise<ReviewChange> => {
        const { operation } = change;
        
        const getBaseFileContent = async (filePath: string) => {
            try {
                return await readFileFromBackup(baseBackupId!, filePath);
            } catch (e) {
                return null;
            }
        };

        if (operation.type === "modify") {
          const originalContent = await getBaseFileContent(operation.filePath);
          if (originalContent === null) return change; // Likely a new file, not identical
          try {
            const modifiedContent = applyJsPatch(originalContent, operation.diff);
            if (modifiedContent !== false && originalContent === modifiedContent) {
              return { ...change, status: "identical" };
            }
          } catch (e) { /* ignore, not identical */ }
        } else if (operation.type === "rewrite") {
           const originalContent = await getBaseFileContent(operation.filePath);
            if (originalContent !== null && originalContent === operation.content) {
                return { ...change, status: "identical" };
            }
        }
        return change;
      })
    );

    set({
      changes,
      isReviewing: true,
      activeChangeId: changes.find(c => c.status === 'pending')?.id ?? changes[0]?.id ?? null,
      errors: {},
      lastReview: null,
    });
  },

  endReview: () => {
    set((state) => {
      // Check if any changes were actually applied in this session.
      const appliedChangesCount = state.changes.filter(
        (c) => c.status === "applied"
      ).length;

      // If no changes were applied, we discard the session entirely.
      // This prevents a "Re-enter Review" button for a session that had no effect.
      if (appliedChangesCount === 0) {
        // Allow the user to re-initiate the review from the same markdown.
        usePromptStore.getState().resetProcessedMarkdown();

        return {
          isReviewing: false,
          changes: [],
          activeChangeId: null,
          sessionBaseBackupId: null, // Clear the base snapshot ID
          errors: {},
          lastReview: null, // Do not save this session
        };
      }
      
      // If changes were applied, the session is persisted to `lastReview`.
      // The primary record is the new state in the history panel.
      return {
        isReviewing: false,
        lastReview: {
          changes: state.changes,
          sessionBaseBackupId: state.sessionBaseBackupId,
        },
        changes: [],
        activeChangeId: null,
        errors: {},
      };
    });
  },

  reenterReview: () => {
    set((state) => {
      if (!state.lastReview) return state;
      const { changes, sessionBaseBackupId } = state.lastReview;
      return {
        isReviewing: true,
        changes,
        sessionBaseBackupId,
        activeChangeId: changes.find(c => c.status !== 'identical')?.id ?? changes[0]?.id ?? null,
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

    if (!change || change.status !== "applied" || !rootPath || !sessionBaseBackupId)
      return;

    try {
      const { operation } = change;
      switch (operation.type) {
        case "modify":
        case "rewrite":
            // We need to know if the file was new relative to the base snapshot.
            // We can check if it exists in the backup.
            try {
                await revertFileFromBackup(rootPath, sessionBaseBackupId, operation.filePath);
            } catch (e) {
                // Assuming error means file did not exist in backup, so it was new.
                await deleteFile(`${rootPath}/${operation.filePath}`);
            }
            break;
        case "delete":
          await revertFileFromBackup(
            rootPath,
            sessionBaseBackupId,
            operation.filePath
          );
          break;
        case "move":
          // Reverting a move means moving it back. We don't need backup for this.
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
      // Optionally set an error state on the change item
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
    const appliedChanges = [...changes].reverse().filter((c) => c.status === "applied");
    for (const change of appliedChanges) {
      await get().revertChange(change.id);
    }
  },
}));