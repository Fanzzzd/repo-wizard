import { v4 as uuidv4 } from 'uuid';

export type Theme = 'light' | 'dark' | 'system';

export interface FileNode {
  path: string;
  name: string;
  children?: FileNode[];
  isDirectory: boolean;
}

export type ComposerMode = 'edit' | 'qa';
export type PromptMode = 'universal' | 'edit' | 'qa';
export type EditFormat = 'diff' | 'whole';
export type ReviewStatus = 'pending' | 'applied' | 'error' | 'identical';

export type ChangeOperation =
  | { type: 'patch'; filePath: string; content: string; isNewFile: boolean; totalBlocks: number; appliedBlocks: number }
  | { type: 'overwrite'; filePath: string; content: string; isNewFile: boolean }
  | { type: 'delete'; filePath: string }
  | { type: 'move'; fromPath: string; toPath: string };

export interface ReviewChange {
  id: string;
  operation: ChangeOperation;
  status: ReviewStatus;
}

export const createReviewChange = (
  operation: ChangeOperation
): ReviewChange => ({
  id: uuidv4(),
  operation,
  status: 'pending',
});

export type PromptType = 'meta' | 'magic';
export type MagicPromptType = 'file-tree' | 'git-diff' | 'terminal-command';

export interface FileTreeConfig {
  scope: 'all' | 'selected';
  maxFilesPerDirectory: number | null;
  ignorePatterns: string;
}

export interface GitDiffConfig {
  type: 'staged' | 'unstaged' | 'commit';
  hash: string | null;
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

// This is a transient type for UI, combining definition with project-specific 'enabled' status.
export interface MetaPrompt extends MetaPromptDefinition {
  enabled: boolean;
}

export interface PromptHistoryEntry {
  id: string;
  timestamp: number;
  instructions: string;
}

export interface GitStatus {
  hasStagedChanges: boolean;
  hasUnstagedChanges: boolean;
}

export interface Commit {
  hash: string;
  message: string;
  author: string;
  date: string;
}

export type CommandStreamEvent =
  | { type: 'stdout'; data: number[] }
  | { type: 'stderr'; data: number[] }
  | { type: 'error'; data: string }
  | { type: 'finish'; data: string };

export interface CliStatusResult {
  status: 'installed' | 'not_installed' | 'error' | 'checking';
  error?: string;
}

export interface CliInstallResult {
  message: string;
}