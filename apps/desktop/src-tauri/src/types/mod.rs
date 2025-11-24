use serde::{Deserialize, Serialize};
use specta::Type;

#[derive(Debug, Serialize, Clone, Type)]
#[serde(rename_all = "camelCase")]
pub struct FileNode {
    pub path: String,
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub children: Option<Vec<FileNode>>,
    pub is_directory: bool,
}

#[derive(Debug, Serialize, Deserialize, PartialEq, Clone, Type)]
#[serde(tag = "type", rename_all = "lowercase")]
pub enum ChangeOperation {
    #[serde(rename_all = "camelCase")]
    Patch {
        file_path: String,
        content: String,
        is_new_file: bool,
        total_blocks: u32,
        applied_blocks: u32,
    },
    #[serde(rename_all = "camelCase")]
    Overwrite {
        file_path: String,
        content: String,
        is_new_file: bool,
    },
    #[serde(rename_all = "camelCase")]
    Delete { file_path: String },
    #[serde(rename_all = "camelCase")]
    Move { from_path: String, to_path: String },
}

#[derive(Debug, Serialize, Deserialize, Clone, Type)]
#[serde(rename_all = "camelCase")]
pub struct GitStatus {
    pub has_staged_changes: bool,
    pub has_unstaged_changes: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone, Type)]
#[serde(rename_all = "camelCase")]
pub struct Commit {
    pub hash: String,
    pub message: String,
    pub author: String,
    pub date: String,
}

#[derive(Debug, Serialize, Deserialize, Type, Clone)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum DiffOption {
    Staged,
    Unstaged,
    Commit { hash: String },
}

#[derive(Debug, Serialize, Clone, Type)]
#[serde(rename_all = "snake_case")]
pub enum CliStatus {
    Installed,
    NotInstalled,
    Error,
}

#[derive(Debug, Serialize, Clone, Type)]
#[serde(rename_all = "camelCase")]
pub struct CliStatusResult {
    pub status: CliStatus,
    pub error: Option<String>,
}

#[derive(Debug, Serialize, Clone, Type)]
#[serde(rename_all = "camelCase")]
pub struct CliInstallResult {
    pub message: String,
}

#[derive(Clone, serde::Serialize, serde::Deserialize, Type)]
#[serde(rename_all = "camelCase", tag = "type", content = "data")]
pub enum CommandStreamEvent {
    Stdout(Vec<u8>),
    Stderr(Vec<u8>),
    Error(String),
    Finish(String),
}

#[derive(Debug, Deserialize, Clone, Type)]
#[serde(rename_all = "camelCase")]
pub struct IgnoreSettings {
    pub respect_gitignore: bool,
    pub custom_ignore_patterns: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct SearchResult {
    pub path: String,
    pub relative_path: String,
    pub name: String,
    pub parent_dir: String,
    pub score: i32,
    pub is_directory: bool,
}
