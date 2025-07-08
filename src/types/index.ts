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
  | { type: "rewrite"; filePath: string; content: string; isNewFile: boolean }
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

export interface MetaPrompt {
  id: string;
  name: string;
  content: string;
  enabled: boolean;
  mode: "edit" | "qa" | "universal";
}