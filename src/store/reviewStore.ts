import { create } from 'zustand';
import type { ChangeOperation, ReviewChange } from '../types';
import { useWorkspaceStore } from './workspaceStore';
import * as reviewService from '../services/reviewService';
import { showErrorDialog } from '../lib/errorHandler';
import { AppError } from '../lib/error';

interface ReviewState {
  isReviewing: boolean;
  changes: ReviewChange[];
  activeChangeId: string | null;
  sessionBaseBackupId: string | null;
  errors: Record<string, string>;
  lastReview: {
    changes: ReviewChange[];
    sessionBaseBackupId: string | null;
  } | null;

  // Actions
  startReview: (markdown: string) => Promise<void>;
  endReview: () => void;
  reenterReview: () => void;
  clearReviewSession: () => void;
  setActiveChangeId: (id: string | null) => void;
  applyChange: (id: string) => Promise<void>;
  revertChange: (id: string) => Promise<void>;
  applyAllPendingChanges: () => Promise<void>;
  revertAllAppliedChanges: () => Promise<void>;
}

const initialState: Omit<
  ReviewState,
  | 'startReview'
  | 'endReview'
  | 'reenterReview'
  | 'clearReviewSession'
  | 'setActiveChangeId'
  | 'applyChange'
  | 'revertChange'
  | 'applyAllPendingChanges'
  | 'revertAllAppliedChanges'
> = {
  isReviewing: false,
  changes: [],
  activeChangeId: null,
  sessionBaseBackupId: null,
  errors: {},
  lastReview: null,
};

const updateWorkspaceOnFileChange = (
  operation: ChangeOperation,
  direction: 'apply' | 'revert'
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
  const isApply = direction === 'apply';

  const isCreateOperation =
    (operation.type === 'patch' || operation.type === 'overwrite') &&
    operation.isNewFile;

  if (isCreateOperation && isApply) {
    addSelectedFilePath(getAbsPath(operation.filePath));
  }

  if (operation.type === 'delete' && isApply) {
    const filePath = getAbsPath(operation.filePath);
    setSelectedFilePaths(selectedFilePaths.filter(p => p !== filePath));
    if (activeFilePath === filePath) setActiveFilePath(null);
  } else if (operation.type === 'move') {
    const from = getAbsPath(isApply ? operation.fromPath : operation.toPath);
    const to = getAbsPath(isApply ? operation.toPath : operation.fromPath);
    const newSelected = selectedFilePaths.map(p => (p === from ? to : p));
    setSelectedFilePaths(newSelected);
    if (activeFilePath === from) setActiveFilePath(to);
  } else if (isCreateOperation && !isApply) {
    const filePath = getAbsPath(operation.filePath);
    removeSelectedFilePath(filePath);
    if (activeFilePath === filePath) setActiveFilePath(null);
  }

  triggerFileTreeRefresh();
};

export const useReviewStore = create<ReviewState>((set, get) => ({
  ...initialState,
  startReview: async (markdown: string) => {
    const { rootPath } = useWorkspaceStore.getState();
    if (!rootPath) return;

    if (get().lastReview?.sessionBaseBackupId) {
      reviewService.cleanupBackup(get().lastReview!.sessionBaseBackupId!);
    }

    const { changes, backupId } = await reviewService.processAndStartReview(
      markdown,
      rootPath
    );
    if (changes.length === 0) return;

    set({
      isReviewing: true,
      changes,
      sessionBaseBackupId: backupId,
      activeChangeId:
        changes.find(c => c.status === 'pending')?.id ?? changes[0]?.id ?? null,
      errors: {},
      lastReview: null,
    });
  },
  endReview: () => {
    const { sessionBaseBackupId, changes } = get();
    const wasAnythingApplied = changes.some(c => c.status === 'applied');
    if (sessionBaseBackupId && !wasAnythingApplied) {
      reviewService.cleanupBackup(sessionBaseBackupId);
    }
    set({
      isReviewing: false,
      lastReview: wasAnythingApplied ? { changes, sessionBaseBackupId } : null,
      changes: [],
      activeChangeId: null,
      sessionBaseBackupId: null,
      errors: {},
    });
  },
  reenterReview: () => {
    set(state => {
      if (!state.lastReview) return state;
      const { changes, sessionBaseBackupId } = state.lastReview;
      return {
        ...state,
        isReviewing: true,
        changes,
        sessionBaseBackupId,
        activeChangeId:
          changes.find(c => c.status !== 'identical')?.id ??
          changes[0]?.id ??
          null,
        lastReview: null,
      };
    });
  },
  clearReviewSession: () => set({ sessionBaseBackupId: null }),
  setActiveChangeId: id => set({ activeChangeId: id }),
  applyChange: async id => {
    const { changes } = get();
    const { rootPath } = useWorkspaceStore.getState();
    const change = changes.find(c => c.id === id);
    if (!change || change.status !== 'pending' || !rootPath) return;

    try {
      await reviewService.applyChange(change, rootPath);
      set(state => ({
        changes: state.changes.map(c =>
          c.id === id ? { ...c, status: 'applied' } : c
        ),
      }));
      updateWorkspaceOnFileChange(change.operation, 'apply');
    } catch (e: any) {
      set(state => ({
        errors: { ...state.errors, [id]: e.toString() },
        changes: state.changes.map(c =>
          c.id === id ? { ...c, status: 'error' } : c
        ),
      }));
    }
  },
  revertChange: async id => {
    const { changes, sessionBaseBackupId } = get();
    const { rootPath } = useWorkspaceStore.getState();
    const change = changes.find(c => c.id === id);
    if (
      !change ||
      change.status !== 'applied' ||
      !rootPath ||
      !sessionBaseBackupId
    )
      return;

    try {
      await reviewService.revertChange(change, sessionBaseBackupId, rootPath);
      set(state => ({
        changes: state.changes.map(c =>
          c.id === id ? { ...c, status: 'pending' } : c
        ),
      }));
      updateWorkspaceOnFileChange(change.operation, 'revert');
    } catch (e: any) {
      showErrorDialog(new AppError(`Failed to revert change ${id}`, e));
    }
  },
  applyAllPendingChanges: async () => {
    const { changes, applyChange } = get();
    for (const change of changes.filter(c => c.status === 'pending')) {
      await applyChange(change.id);
    }
  },
  revertAllAppliedChanges: async () => {
    const { changes, revertChange } = get();
    for (const change of [...changes]
      .reverse()
      .filter(c => c.status === 'applied')) {
      await revertChange(change.id);
    }
  },
}));