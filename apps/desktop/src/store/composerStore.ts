import { create } from 'zustand';
import type { ComposerMode } from '../types';

interface HistoryState {
  past: string[];
  future: string[];
}

export interface ComposerState {
  composerMode: ComposerMode;

  instructions: string;
  instructionsHistory: HistoryState;

  markdownResponse: string;
  markdownResponseHistory: HistoryState;

  processedMarkdownResponse: string | null;
  enabledMetaPromptIds: string[];

  setComposerMode: (mode: ComposerMode) => void;

  setInstructions: (instructions: string) => void;
  undoInstructions: () => void;
  redoInstructions: () => void;

  setMarkdownResponse: (response: string) => void;
  undoMarkdownResponse: () => void;
  redoMarkdownResponse: () => void;

  markMarkdownAsProcessed: () => void;
  setEnabledMetaPromptIds: (ids: string[]) => void;

  // For persistence
  _load: (state: Partial<ComposerState>) => void;
  _reset: () => void;
}

const initialHistory: HistoryState = { past: [], future: [] };

const initialState = {
  composerMode: 'edit' as ComposerMode,
  instructions: '',
  instructionsHistory: initialHistory,
  markdownResponse: '',
  markdownResponseHistory: initialHistory,
  processedMarkdownResponse: null,
  enabledMetaPromptIds: [],
};

export const useComposerStore = create<ComposerState>((set) => ({
  ...initialState,

  setComposerMode: (mode) => set({ composerMode: mode }),

  setInstructions: (newInstructions) =>
    set((state) => {
      if (state.instructions === newInstructions) return {};
      return {
        instructions: newInstructions,
        instructionsHistory: {
          past: [...state.instructionsHistory.past, state.instructions],
          future: [],
        },
      };
    }),

  undoInstructions: () =>
    set((state) => {
      const { past, future } = state.instructionsHistory;
      if (past.length === 0) return {};
      const previous = past[past.length - 1];
      const newPast = past.slice(0, past.length - 1);
      return {
        instructions: previous,
        instructionsHistory: {
          past: newPast,
          future: [state.instructions, ...future],
        },
      };
    }),

  redoInstructions: () =>
    set((state) => {
      const { past, future } = state.instructionsHistory;
      if (future.length === 0) return {};
      const next = future[0];
      const newFuture = future.slice(1);
      return {
        instructions: next,
        instructionsHistory: {
          past: [...past, state.instructions],
          future: newFuture,
        },
      };
    }),

  setMarkdownResponse: (newResponse) =>
    set((state) => {
      if (state.markdownResponse === newResponse) return {};
      return {
        markdownResponse: newResponse,
        markdownResponseHistory: {
          past: [...state.markdownResponseHistory.past, state.markdownResponse],
          future: [],
        },
      };
    }),

  undoMarkdownResponse: () =>
    set((state) => {
      const { past, future } = state.markdownResponseHistory;
      if (past.length === 0) return {};
      const previous = past[past.length - 1];
      const newPast = past.slice(0, past.length - 1);
      return {
        markdownResponse: previous,
        markdownResponseHistory: {
          past: newPast,
          future: [state.markdownResponse, ...future],
        },
      };
    }),

  redoMarkdownResponse: () =>
    set((state) => {
      const { past, future } = state.markdownResponseHistory;
      if (future.length === 0) return {};
      const next = future[0];
      const newFuture = future.slice(1);
      return {
        markdownResponse: next,
        markdownResponseHistory: {
          past: [...past, state.markdownResponse],
          future: newFuture,
        },
      };
    }),

  markMarkdownAsProcessed: () =>
    set((state) => ({ processedMarkdownResponse: state.markdownResponse })),
  setEnabledMetaPromptIds: (ids) => set({ enabledMetaPromptIds: ids }),

  _load: (state) =>
    set({
      ...state,
      // Reset history on load to prevent weird states from persistence
      instructionsHistory: initialHistory,
      markdownResponseHistory: initialHistory,
    }),
  _reset: () => set(initialState),
}));
