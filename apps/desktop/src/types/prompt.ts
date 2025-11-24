import type { DiffOption } from '../bindings';

// Alias DiffOption from bindings to GitDiffConfig for consistent usage
export type GitDiffConfig = DiffOption;

export type PromptMode = 'universal' | 'edit' | 'qa';

export type ComposerMode = 'edit' | 'qa';

export type EditFormat = 'diff' | 'whole';

export type PromptType = 'meta' | 'magic';

export type MagicPromptType = 'file-tree' | 'git-diff' | 'terminal-command';

export interface FileTreeConfig {
  scope: 'all' | 'selected';
  maxFilesPerDirectory: number | null;
  ignorePatterns: string;
}

export interface TerminalCommandConfig {
  command: string;
}

export interface MetaPromptDefinition {
  id: string;
  name: string;
  content: string;
  mode: PromptMode;
  promptType: PromptType;
  magicType?: MagicPromptType;
  fileTreeConfig?: FileTreeConfig;
  gitDiffConfig?: GitDiffConfig;
  terminalCommandConfig?: TerminalCommandConfig;
}

export interface MetaPrompt extends MetaPromptDefinition {
  enabled: boolean;
}

export interface PromptHistoryEntry {
  id: string;
  timestamp: number;
  instructions: string;
}
