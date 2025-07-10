import { invoke } from "@tauri-apps/api/core";
import type { FileNode, ChangeOperation } from "../types";
import { AppError } from "../lib/error";

interface IgnoreSettings {
  respectGitignore: boolean;
  customIgnorePatterns: string;
}

export const listDirectoryRecursive = async (
  path: string,
  settings: IgnoreSettings
): Promise<FileNode> => {
  try {
    return await invoke("list_directory_recursive", { path, settings });
  } catch (err) {
    throw new AppError(`Failed to list directory: ${path}`, err);
  }
};

export const readFileContent = async (path: string): Promise<string> => {
  try {
    return await invoke("read_file_content", { path });
  } catch (err) {
    throw new AppError(`Failed to read file content for: ${path}`, err);
  }
};

export const writeFileContent = async (
  path: string,
  content: string
): Promise<void> => {
  try {
    return await invoke("write_file_content", { path, content });
  } catch (err) {
    throw new AppError(`Failed to write file content for: ${path}`, err);
  }
};

export const applyPatch = async (
  filePath: string,
  patchStr: string
): Promise<void> => {
  try {
    return await invoke("apply_patch", { filePath, patchStr });
  } catch (err) {
    throw new AppError(`Failed to apply patch to file: ${filePath}`, err);
  }
};

export const deleteFile = async (filePath: string): Promise<void> => {
  try {
    return await invoke("delete_file", { filePath });
  } catch (err) {
    throw new AppError(`Failed to delete file: ${filePath}`, err);
  }
};

export const moveFile = async (from: string, to: string): Promise<void> => {
  try {
    return await invoke("move_file", { from, to });
  } catch (err) {
    throw new AppError(`Failed to move file from ${from} to ${to}`, err);
  }
};

export const backupFiles = async (
  rootPath: string,
  filePaths: string[]
): Promise<string> => {
  try {
    return await invoke("backup_files", { rootPath, filePaths });
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
    return await invoke("revert_file_from_backup", {
      rootPath,
      backupId,
      relativePath,
    });
  } catch (err) {
    throw new AppError(`Failed to revert file from backup: ${relativePath}`, err);
  }
};

export const readFileFromBackup = async (
  backupId: string,
  relativePath: string
): Promise<string> => {
  try {
    return await invoke("read_file_from_backup", { backupId, relativePath });
  } catch (err) {
    throw new AppError(`Failed to read file from backup: ${relativePath}`, err);
  }
};

export const deleteBackup = async (backupId: string): Promise<void> => {
  try {
    return await invoke("delete_backup", { backupId });
  } catch (err) {
    throw new AppError(`Failed to delete backup: ${backupId}`, err);
  }
};

export const getRelativePath = async (
  fullPath: string,
  rootPath: string
): Promise<string> => {
  try {
    return await invoke("get_relative_path", { fullPath, rootPath });
  } catch (err) {
    throw new AppError(`Failed to get relative path for: ${fullPath}`, err);
  }
};

export const parseChangesFromMarkdown = async (
  markdown: string
): Promise<ChangeOperation[]> => {
  try {
    return await invoke("parse_changes_from_markdown", { markdown });
  } catch (err) {
    throw new AppError("Failed to parse changes from markdown", err);
  }
};