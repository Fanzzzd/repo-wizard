import { v4 as uuidv4 } from "uuid";

export interface FileNode {
  path: string;
  name: string;
  children?: FileNode[];
  isDirectory: boolean;
}

export type EditFormat = "udiff" | "diff-fenced" | "whole";

export type ChangeOperation =
  | { type: "modify"; filePath: string; diff: string; isNewFile: boolean }
  | { type: "rewrite"; filePath: string; content: string }
  | { type: "delete"; filePath: string }
  | { type: "move"; fromPath: string; toPath: string };

export interface ReviewChange {
  id: string; // unique ID for each change
  operation: ChangeOperation;
  status: "pending" | "applied" | "error" | "identical";
}

export const createReviewChange = (operation: ChangeOperation): ReviewChange => ({
  id: uuidv4(),
  operation,
  status: "pending",
});

export interface FileChangeInfo {
  path: string;
  type: "modified" | "added" | "deleted" | "renamed";
  newPath?: string;
}

export interface HistoryState {
  id: string;
  timestamp: number;
  description: string;
  rootPath: string;
  backupId: string;
  changedFiles: FileChangeInfo[];
  files: string[]; // List of all relative file paths in this state
  isInitialState?: boolean;
}

export interface MetaPrompt {
  id: string;
  name: string;
  content: string;
  enabled: boolean;
}