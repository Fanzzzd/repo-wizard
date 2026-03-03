use serde::{Deserialize, Serialize};
use specta::Type;

#[derive(Debug, Serialize, Deserialize, Clone, Type)]
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
    Workspace,
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

#[derive(Debug, Serialize, Deserialize, Clone, Type)]
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

#[derive(Debug, Serialize, Clone, Type)]
#[serde(rename_all = "camelCase")]
pub struct FileTokenInfo {
    pub path: String,
    pub exists: bool,
    pub is_binary: bool,
    pub tokens: u32,
}

#[derive(Debug, Serialize, Deserialize, Clone, Type)]
#[serde(rename_all = "camelCase")]
pub enum PromptMode {
    Universal,
    Edit,
    Qa,
}

#[derive(Debug, Serialize, Deserialize, Clone, Type)]
#[serde(rename_all = "camelCase")]
pub enum ComposerMode {
    Edit,
    Qa,
}

#[derive(Debug, Serialize, Deserialize, Clone, Type)]
#[serde(rename_all = "camelCase")]
pub enum EditFormat {
    Diff,
    Whole,
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Type)]
#[serde(rename_all = "camelCase")]
pub enum PromptType {
    Meta,
    Magic,
}

#[derive(Debug, Serialize, Deserialize, Clone, Type)]
#[serde(rename_all = "kebab-case")]
pub enum MagicPromptType {
    FileTree,
    GitDiff,
    TerminalCommand,
}

#[derive(Debug, Serialize, Deserialize, Clone, Type)]
#[serde(rename_all = "camelCase")]
pub enum FileTreeScope {
    All,
    Selected,
}

#[derive(Debug, Serialize, Deserialize, Clone, Type)]
#[serde(rename_all = "camelCase")]
pub struct FileTreeConfig {
    pub scope: FileTreeScope,
    pub max_files_per_directory: Option<i32>,
    pub ignore_patterns: String,
}

#[derive(Debug, Serialize, Deserialize, Clone, Type)]
#[serde(rename_all = "camelCase")]
pub struct TerminalCommandConfig {
    pub command: String,
}

#[derive(Debug, Serialize, Deserialize, Clone, Type)]
#[serde(rename_all = "camelCase")]
pub struct MetaPrompt {
    pub id: String,
    pub name: String,
    pub content: String,
    pub mode: PromptMode,
    pub prompt_type: PromptType,
    pub magic_type: Option<MagicPromptType>,
    pub file_tree_config: Option<FileTreeConfig>,
    pub git_diff_config: Option<DiffOption>,
    pub terminal_command_config: Option<TerminalCommandConfig>,
    pub enabled: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone, Type)]
#[serde(rename_all = "camelCase")]
pub struct PromptEstimateInput {
    pub selected_file_paths: Vec<String>,
    pub instructions: String,
    pub custom_system_prompt: String,
    pub edit_format: EditFormat,
    pub composer_mode: ComposerMode,
    pub meta_prompts: Vec<MetaPrompt>,
    pub root_path: Option<String>,
    pub file_tree: Option<FileNode>,
    pub ignore_settings: Option<IgnoreSettings>,
}

#[derive(Debug, Serialize, Deserialize, Clone, Type)]
#[serde(rename_all = "camelCase")]
pub struct PromptEstimateResult {
    pub total_tokens: u32,
    pub missing_paths: Vec<String>,
}
