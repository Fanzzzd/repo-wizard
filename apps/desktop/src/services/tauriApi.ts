import { type Channel, invoke } from '@tauri-apps/api/core';
import { AppError } from '../lib/error';
import type {
  ChangeOperation,
  CliInstallResult,
  CliStatusResult,
  CommandStreamEvent,
  Commit,
  FileNode,
  GitDiffConfig,
  GitStatus,
} from '../types';

interface IgnoreSettings {
  respectGitignore: boolean;
  customIgnorePatterns: string;
}

export const listDirectoryRecursive = async (
  path: string,
  settings: IgnoreSettings
): Promise<FileNode> => {
  try {
    return await invoke('list_directory_recursive', { path, settings });
  } catch (err) {
    throw new AppError(`Failed to list directory: ${path}`, err);
  }
};

export const readFileAsBase64 = async (path: string): Promise<string> => {
  try {
    return await invoke('read_file_as_base64', { path });
  } catch (err) {
    throw new AppError(`Failed to read file as base64 for: ${path}`, err);
  }
};

export const readFileContent = async (path: string): Promise<string> => {
  try {
    return await invoke('read_file_content', { path });
  } catch (err) {
    throw new AppError(`Failed to read file content for: ${path}`, err);
  }
};

export const isBinaryFile = async (path: string): Promise<boolean> => {
  try {
    return await invoke('is_binary_file', { path });
  } catch (err) {
    // If check fails, assume it's binary to be safe.
    console.warn(
      new AppError(`Failed to check if file is binary: ${path}`, err)
    );
    return true;
  }
};

export const fileExists = async (path: string): Promise<boolean> => {
  try {
    return await invoke('file_exists', { path });
  } catch (_err) {
    // If the existence check fails, assume it doesn't exist
    return false;
  }
};

export const writeFileContent = async (
  path: string,
  content: string
): Promise<void> => {
  try {
    return await invoke('write_file_content', { path, content });
  } catch (err) {
    throw new AppError(`Failed to write file content for: ${path}`, err);
  }
};

export const deleteFile = async (filePath: string): Promise<void> => {
  try {
    return await invoke('delete_file', { filePath });
  } catch (err) {
    throw new AppError(`Failed to delete file: ${filePath}`, err);
  }
};

export const moveFile = async (from: string, to: string): Promise<void> => {
  try {
    return await invoke('move_file', { from, to });
  } catch (err) {
    throw new AppError(`Failed to move file from ${from} to ${to}`, err);
  }
};

export const backupFiles = async (
  rootPath: string,
  filePaths: string[]
): Promise<string> => {
  try {
    return await invoke('backup_files', { rootPath, filePaths });
  } catch (err) {
    throw new AppError(`Failed to backup files for project: ${rootPath}`, err);
  }
};

export const revertFileFromBackup = async (
  rootPath: string,
  backupId: string,
  relativePath: string
): Promise<void> => {
  try {
    return await invoke('revert_file_from_backup', {
      rootPath,
      backupId,
      relativePath,
    });
  } catch (err) {
    throw new AppError(
      `Failed to revert file from backup: ${relativePath}`,
      err
    );
  }
};

export const readFileFromBackup = async (
  backupId: string,
  relativePath: string
): Promise<string> => {
  try {
    return await invoke('read_file_from_backup', { backupId, relativePath });
  } catch (err) {
    throw new AppError(`Failed to read file from backup: ${relativePath}`, err);
  }
};

export const deleteBackup = async (backupId: string): Promise<void> => {
  try {
    return await invoke('delete_backup', { backupId });
  } catch (err) {
    throw new AppError(`Failed to delete backup: ${backupId}`, err);
  }
};

export const getRelativePath = async (
  fullPath: string,
  rootPath: string
): Promise<string> => {
  try {
    return await invoke('get_relative_path', { fullPath, rootPath });
  } catch (err) {
    throw new AppError(`Failed to get relative path for: ${fullPath}`, err);
  }
};

export const parseChangesFromMarkdown = async (
  markdown: string,
  rootPath: string
): Promise<ChangeOperation[]> => {
  try {
    return await invoke('parse_changes_from_markdown', { markdown, rootPath });
  } catch (err) {
    throw new AppError('Failed to parse changes from markdown', err);
  }
};

export const isGitRepository = async (path: string): Promise<boolean> => {
  try {
    return await invoke('is_git_repository', { path });
  } catch (err) {
    throw new AppError(`Failed to check if path is git repo: ${path}`, err);
  }
};

export const getGitStatus = async (repoPath: string): Promise<GitStatus> => {
  try {
    return await invoke('get_git_status', { repoPath });
  } catch (err) {
    throw new AppError(`Failed to get git status for: ${repoPath}`, err);
  }
};

export const getRecentCommits = async (
  repoPath: string,
  count: number
): Promise<Commit[]> => {
  try {
    return await invoke('get_recent_commits', { repoPath, count });
  } catch (err) {
    throw new AppError(`Failed to get recent commits for: ${repoPath}`, err);
  }
};

export const getGitDiff = async (
  repoPath: string,
  config: GitDiffConfig
): Promise<string> => {
  let option: { type: string; hash?: string };
  if (config.type === 'commit') {
    if (!config.hash) {
      throw new AppError('Commit hash is required for commit diff.', null);
    }
    option = { type: 'commit', hash: config.hash };
  } else {
    option = { type: config.type };
  }

  try {
    return await invoke('get_git_diff', { repoPath, option });
  } catch (err) {
    throw new AppError(`Failed to get git diff for: ${repoPath}`, err);
  }
};

export const startPtySession = async (
  rootPath: string,
  command: string | null,
  onEvent: Channel<CommandStreamEvent>
) => {
  try {
    await invoke('start_pty_session', { rootPath, command, onEvent });
  } catch (err) {
    console.error('Failed to start PTY session:', err);
    throw err;
  }
};

export const resizePty = async (rows: number, cols: number): Promise<void> => {
  try {
    await invoke('resize_pty', { rows, cols });
  } catch (err) {
    console.warn(`Failed to resize PTY:`, err);
  }
};

export const writeToPty = async (text: string): Promise<void> => {
  try {
    await invoke('write_to_pty', { text });
  } catch (err) {
    console.warn('Failed to write to PTY:', err);
  }
};

export const killPty = async (): Promise<void> => {
  try {
    await invoke('kill_pty');
  } catch (err) {
    console.warn('Failed to kill PTY:', err);
  }
};

export const getCliStatus = async (): Promise<CliStatusResult> => {
  try {
    return await invoke('get_cli_status');
  } catch (err) {
    throw new AppError('Failed to check CLI status', err);
  }
};

export const installCliShim = async (): Promise<CliInstallResult> => {
  try {
    return await invoke('install_cli_shim');
  } catch (err) {
    throw new AppError('Failed to install CLI shim', err);
  }
};

export const startWatching = async (
  rootPath: string,
  settings: IgnoreSettings
): Promise<void> => {
  try {
    await invoke('start_watching', { rootPath, settings });
  } catch (err) {
    throw new AppError(`Failed to start watching: ${rootPath}`, err);
  }
};

export const stopWatching = async (rootPath: string): Promise<void> => {
  try {
    await invoke('stop_watching', { rootPath });
  } catch (err) {
    console.warn(new AppError(`Failed to stop watching: ${rootPath}`, err));
  }
};
