import { v4 as uuidv4 } from "uuid";

export interface FileNode {
  path: string;
  name: string;
  children?: FileNode[];
  isDirectory: boolean;
}

export type ComposerMode = "edit" | "qa";
export type PromptMode = "universal" | "edit" | "qa";
export type EditFormat = "udiff" | "diff-fenced" | "whole";
export type ReviewStatus = "pending" | "applied" | "error" | "identical";

export type ChangeOperation =
  | { type: "modify"; filePath: string; diff: string; isNewFile: boolean }
  | { type: "rewrite"; filePath: string; content: string; isNewFile: boolean }
  | { type: "delete"; filePath: string }
  | { type: "move"; fromPath: string; toPath: string };

export interface ReviewChange {
  id: string;
  operation: ChangeOperation;
  status: ReviewStatus;
}

export const createReviewChange = (operation: ChangeOperation): ReviewChange => ({
  id: uuidv4(),
  operation,
  status: "pending",
});

export interface MetaPromptDefinition {
  id: string;
  name: string;
  content: string;
  mode: PromptMode;
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