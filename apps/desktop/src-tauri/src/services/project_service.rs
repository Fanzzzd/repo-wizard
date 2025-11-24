use crate::core::fs_utils;
use crate::types::{FileNode, IgnoreSettings};
use anyhow::Result;
use std::path::Path;

pub async fn list_directory_recursive(
    root_path: &Path,
    settings: IgnoreSettings,
) -> Result<FileNode> {
    fs_utils::list_directory_recursive(root_path, settings).await
}

pub async fn read_file_content(path: &Path) -> Result<String> {
    fs_utils::read_file_content(path).await
}

pub async fn read_file_bytes(path: &Path) -> Result<Vec<u8>> {
    fs_utils::read_file_bytes(path).await
}

pub async fn write_file_content(path: &Path, content: &str, root_path: &Path) -> Result<()> {
    fs_utils::write_file_content(path, content, root_path).await
}

pub async fn delete_file(path: &Path, root_path: &Path) -> Result<()> {
    fs_utils::delete_file(path, root_path).await
}

pub async fn move_file(from: &Path, to: &Path, root_path: &Path) -> Result<()> {
    fs_utils::move_file(from, to, root_path).await
}

pub async fn is_binary(path: &Path) -> Result<bool> {
    fs_utils::is_binary(path).await
}
