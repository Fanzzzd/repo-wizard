use crate::core::fs_utils;
use crate::types::{FileNode, IgnoreSettings};
use anyhow::Result;
use std::path::{Path, PathBuf};

pub async fn list_directory_recursive(
    root_path: &Path,
    settings: IgnoreSettings,
) -> Result<FileNode> {
    fs_utils::list_directory_recursive(root_path, settings).await
}

pub async fn read_file_content(path: &PathBuf) -> Result<String> {
    fs_utils::read_file_content(path).await
}

pub async fn read_file_bytes(path: &PathBuf) -> Result<Vec<u8>> {
    fs_utils::read_file_bytes(path).await
}

pub async fn write_file_content(path: &PathBuf, content: &str) -> Result<()> {
    fs_utils::write_file_content(path, content).await
}

pub async fn delete_file(path: &PathBuf) -> Result<()> {
    fs_utils::delete_file(path).await
}

pub async fn move_file(from: &PathBuf, to: &PathBuf) -> Result<()> {
    fs_utils::move_file(from, to).await
}

pub async fn is_binary(path: &Path) -> Result<bool> {
    fs_utils::is_binary(path).await
}
