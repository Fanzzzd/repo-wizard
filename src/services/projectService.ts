import { listDirectoryRecursive, deleteBackup } from "./tauriApi";
import type { FileNode } from "../types";
import { showErrorDialog } from "../lib/errorHandler";

interface IgnoreSettings {
  respectGitignore: boolean;
  customIgnorePatterns: string;
}

export async function loadFileTree(
  path: string,
  settings: IgnoreSettings
): Promise<FileNode> {
  return listDirectoryRecursive(path, settings);
}

export async function cleanupBackup(backupId: string) {
  try {
    await deleteBackup(backupId);
  } catch (error) {
    showErrorDialog(error);
  }
}