import type { FileNode, IgnoreSettings } from '../bindings';
import { showErrorDialog } from '../lib/errorHandler';
import { deleteBackup, listDirectoryRecursive } from './tauriApi';

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
