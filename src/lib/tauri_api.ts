import { invoke } from "@tauri-apps/api/core";
import type { FileNode, ChangeOperation } from "../types";

interface IgnoreSettings {
  respectGitignore: boolean;
  customIgnorePatterns: string;
}

export const listDirectoryRecursive = (
  path: string,
  settings: IgnoreSettings
): Promise<FileNode> => {
  return invoke("list_directory_recursive", { path, settings });
};

export const readFileContent = (path: string): Promise<string> => {
  return invoke("read_file_content", { path });
};

export const writeFileContent = (
  path: string,
  content: string
): Promise<void> => {
  return invoke("write_file_content", { path, content });
};

export const applyPatch = (
  filePath: string,
  patchStr: string
): Promise<void> => {
  return invoke("apply_patch", { filePath, patchStr });
};

export const deleteFile = (filePath: string): Promise<void> => {
  return invoke("delete_file", { filePath });
};

export const moveFile = (from: string, to: string): Promise<void> => {
  return invoke("move_file", { from, to });
};

export const backupFiles = (
  rootPath: string,
  filePaths: string[]
): Promise<string> => {
  return invoke("backup_files", { rootPath, filePaths });
};

export const revertFileFromBackup = (
  rootPath: string,
  backupId: string,
  relativePath: string
): Promise<void> => {
  return invoke("revert_file_from_backup", {
    rootPath,
    backupId,
    relativePath,
  });
};

export const readFileFromBackup = (
    backupId: string,
    relativePath: string
): Promise<string> => {
    return invoke("read_file_from_backup", { backupId, relativePath });
}

export const deleteBackup = (backupId: string): Promise<void> => {
  return invoke("delete_backup", { backupId });
};

export const getRelativePath = (
  fullPath: string,
  rootPath: string
): Promise<string> => {
  return invoke("get_relative_path", { fullPath, rootPath });
};

export const parseChangesFromMarkdown = (markdown: string): Promise<ChangeOperation[]> => {
  return invoke("parse_changes_from_markdown", { markdown });
};