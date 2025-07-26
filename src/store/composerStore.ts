import { create } from 'zustand';
import type { ComposerMode } from '../types';

interface ComposerState {
  composerMode: ComposerMode;
  instructions: string;
  markdownResponse: string;
  processedMarkdownResponse: string | null;
  enabledMetaPromptIds: string[];

  setComposerMode: (mode: ComposerMode) => void;
  setInstructions: (instructions: string) => void;
  setMarkdownResponse: (response: string) => void;
  markMarkdownAsProcessed: () => void;
  setEnabledMetaPromptIds: (ids: string[]) => void;

  // For persistence
  _load: (state: Partial<ComposerState>) => void;
  _reset: () => void;
}

const initialState: Omit<
  ComposerState,
  | '_load'
  | '_reset'
  | 'setComposerMode'
  | 'setInstructions'
  | 'setMarkdownResponse'
  | 'markMarkdownAsProcessed'
  | 'setEnabledMetaPromptIds'
> = {
  composerMode: 'edit',
  instructions: '',
  markdownResponse: '',
  processedMarkdownResponse: null,
  enabledMetaPromptIds: [],
};

export const useComposerStore = create<ComposerState>(set => ({
  ...initialState,

  setComposerMode: mode => set({ composerMode: mode }),
  setInstructions: instructions => set({ instructions }),
  setMarkdownResponse: response => set({ markdownResponse: response }),
  markMarkdownAsProcessed: () =>
    set(state => ({ processedMarkdownResponse: state.markdownResponse })),
  setEnabledMetaPromptIds: ids => set({ enabledMetaPromptIds: ids }),

  _load: state => set(state),
  _reset: () => set(initialState),
}));
