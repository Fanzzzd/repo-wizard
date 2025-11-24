import type { EditFormat, MetaPromptDefinition } from './prompt';

export type Theme = 'light' | 'dark' | 'system';

export interface AppSettings {
  respectGitignore: boolean;
  customIgnorePatterns: string;
  customSystemPrompt: string;
  editFormat: EditFormat;
  metaPrompts: MetaPromptDefinition[];
  autoReviewOnPaste: boolean;
  recentProjects: string[];
  promptHistoryLimit: number;
  enableClipboardReview: boolean;
  showPasteResponseArea: boolean;
  theme: Theme;
}
