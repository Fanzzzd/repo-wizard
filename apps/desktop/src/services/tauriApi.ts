import type { Channel } from '@tauri-apps/api/core';
import {
  type ChangeOperation,
  type CliInstallResult,
  type CliStatusResult,
  type CommandStreamEvent,
  type Commit,
  commands,
  type DiffOption,
  type FileNode,
  type GitStatus,
  type IgnoreSettings,
  type Result,
  type SearchResult,
} from '../bindings';
import { AppError } from '../lib/error';

// Helper to unwrap Result from tauri-specta
async function unwrap<T, E>(promise: Promise<Result<T, E>>): Promise<T> {
  const result = await promise;
  if (result.status === 'ok') {
    return result.data;
  } else {
    throw new AppError(String(result.error), null);
  }
}

export const listDirectoryRecursive = async (
  path: string,
  settings: IgnoreSettings
): Promise<FileNode> => {
  return unwrap(commands.listDirectoryRecursive(path, settings));
};

export const readFileAsBase64 = async (path: string): Promise<string> => {
  return unwrap(commands.readFileAsBase64(path));
};

export const readFileContent = async (path: string): Promise<string> => {
  return unwrap(commands.readFileContent(path));
};

export const isBinaryFile = async (path: string): Promise<boolean> => {
  try {
    return await unwrap(commands.isBinaryFile(path));
  } catch (err) {
    console.warn(
      new AppError(`Failed to check if file is binary: ${path}`, err)
    );
    return true;
  }
};

export const fileExists = async (path: string): Promise<boolean> => {
  try {
    return await unwrap(commands.fileExists(path));
  } catch (_err) {
    return false;
  }
};

export const writeFileContent = async (
  path: string,
  content: string
): Promise<void> => {
  await unwrap(commands.writeFileContent(path, content));
};

export const deleteFile = async (filePath: string): Promise<void> => {
  await unwrap(commands.deleteFile(filePath));
};

export const moveFile = async (from: string, to: string): Promise<void> => {
  await unwrap(commands.moveFile(from, to));
};

export const backupFiles = async (
  rootPath: string,
  filePaths: string[]
): Promise<string> => {
  return unwrap(commands.backupFiles(rootPath, filePaths));
};

export const revertFileFromBackup = async (
  rootPath: string,
  backupId: string,
  relativePath: string
): Promise<void> => {
  await unwrap(commands.revertFileFromBackup(rootPath, backupId, relativePath));
};

export const readFileFromBackup = async (
  backupId: string,
  relativePath: string
): Promise<string> => {
  return unwrap(commands.readFileFromBackup(backupId, relativePath));
};

export const deleteBackup = async (backupId: string): Promise<void> => {
  await unwrap(commands.deleteBackup(backupId));
};

export const getRelativePath = async (
  fullPath: string,
  rootPath: string
): Promise<string> => {
  return unwrap(commands.getRelativePath(fullPath, rootPath));
};

export const parseChangesFromMarkdown = async (
  markdown: string,
  rootPath: string
): Promise<ChangeOperation[]> => {
  return unwrap(commands.parseChangesFromMarkdown(markdown, rootPath));
};

export const isGitRepository = async (path: string): Promise<boolean> => {
  return unwrap(commands.isGitRepository(path));
};

export const getGitStatus = async (repoPath: string): Promise<GitStatus> => {
  return unwrap(commands.getGitStatus(repoPath));
};

export const getRecentCommits = async (
  repoPath: string,
  count: number
): Promise<Commit[]> => {
  return unwrap(commands.getRecentCommits(repoPath, count));
};

export const getGitDiff = async (
  repoPath: string,
  config: DiffOption
): Promise<string> => {
  return unwrap(commands.getGitDiff(repoPath, config));
};

export const startPtySession = async (
  rootPath: string,
  command: string | null,
  onEvent: Channel<CommandStreamEvent>
) => {
  try {
    await unwrap(commands.startPtySession(rootPath, command, onEvent));
  } catch (err) {
    console.error('Failed to start PTY session:', err);
    throw err;
  }
};

export const resizePty = async (rows: number, cols: number): Promise<void> => {
  try {
    await unwrap(commands.resizePty(rows, cols));
  } catch (err) {
    console.warn(`Failed to resize PTY:`, err);
  }
};

export const writeToPty = async (text: string): Promise<void> => {
  try {
    await unwrap(commands.writeToPty(text));
  } catch (err) {
    console.warn('Failed to write to PTY:', err);
  }
};

export const killPty = async (): Promise<void> => {
  try {
    await unwrap(commands.killPty());
  } catch (err) {
    console.warn('Failed to kill PTY:', err);
  }
};

export const getCliStatus = async (): Promise<CliStatusResult> => {
  return unwrap(commands.getCliStatus());
};

export const installCliShim = async (): Promise<CliInstallResult> => {
  return unwrap(commands.installCliShim());
};

export const startWatching = async (
  rootPath: string,
  settings: IgnoreSettings
): Promise<void> => {
  await unwrap(commands.startWatching(rootPath, settings));
};

export const stopWatching = async (rootPath: string): Promise<void> => {
  try {
    await unwrap(commands.stopWatching(rootPath));
  } catch (err) {
    console.warn(new AppError(`Failed to stop watching: ${rootPath}`, err));
  }
};

export const searchFiles = async (
  query: string,
  rootPath: string,
  settings: IgnoreSettings,
  limit: number | null = null
): Promise<SearchResult[]> => {
  return unwrap(commands.searchFiles(query, rootPath, settings, limit));
};
