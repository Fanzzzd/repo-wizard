use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Clone)]
pub struct FileNode {
    pub path: String,
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub children: Option<Vec<FileNode>>,
    #[serde(rename = "isDirectory")]
    pub is_directory: bool,
}

#[derive(Debug, Serialize, Deserialize, PartialEq, Clone)]
#[serde(tag = "type", rename_all = "lowercase")]
pub enum ChangeOperation {
    Modify {
        #[serde(rename = "filePath")]
        file_path: String,
        content: String,
        #[serde(rename = "isNewFile")]
        is_new_file: bool,
    },
    Rewrite {
        #[serde(rename = "filePath")]
        file_path: String,
        content: String,
        #[serde(rename = "isNewFile")]
        is_new_file: bool,
    },
    Delete {
        #[serde(rename = "filePath")]
        file_path: String,
    },
    Move {
        #[serde(rename = "fromPath")]
        from_path: String,
        #[serde(rename = "toPath")]
        to_path: String,
    },
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct GitStatus {
    pub has_staged_changes: bool,
    pub has_unstaged_changes: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Commit {
    pub hash: String,
    pub message: String,
    pub author: String,
    pub date: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum DiffOption {
    Staged,
    Unstaged,
    Commit { hash: String },
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct CliStatusResult {
    pub status: String,
    pub error: Option<String>,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct CliInstallResult {
    pub message: String,
}

#[derive(Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase", tag = "type", content = "data")]
pub enum CommandStreamEvent {
    Stdout(Vec<u8>),
    Stderr(Vec<u8>),
    Error(String),
    Finish(String),
}

#[derive(Debug, Deserialize, Clone)]
pub struct IgnoreSettings {
    #[serde(rename = "respectGitignore")]
    pub respect_gitignore: bool,
    #[serde(rename = "customIgnorePatterns")]
    pub custom_ignore_patterns: String,
}
