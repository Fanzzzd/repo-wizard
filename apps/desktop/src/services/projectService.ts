import { showErrorDialog } from '../lib/errorHandler';
import type { FileNode } from '../types';
import { deleteBackup, listDirectoryRecursive } from './tauriApi';

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
