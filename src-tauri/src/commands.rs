use crate::core::pty_utils::CommandStreamPayload;
use crate::core::{cli_utils, fs_utils, git_utils, parser, patcher, path_utils, pty_utils};
use crate::error::Result;
use base64::{engine::general_purpose, Engine as _};
use serde::Deserialize;
use std::path::PathBuf;
use tauri::ipc::Channel;
use tauri::Manager;
use uuid::Uuid;

#[derive(Debug, Deserialize)]
pub struct IgnoreSettings {
    #[serde(rename = "respectGitignore")]
    pub respect_gitignore: bool,
    #[serde(rename = "customIgnorePatterns")]
    pub custom_ignore_patterns: String,
}

#[tauri::command]
pub async fn open_project_window(app: tauri::AppHandle, root_path: String) -> Result<()> {
    let window_label = format!(
        "project-{}",
        general_purpose::URL_SAFE_NO_PAD.encode(&root_path)
    );
    if let Some(window) = app.get_webview_window(&window_label) {
        window.set_focus()?;
        return Ok(());
    }

    let root_path_json = serde_json::to_string(&root_path)?;
    let init_script = format!("window.__RPO_WIZ_PROJECT_ROOT__ = {};", root_path_json);

    tauri::WebviewWindowBuilder::new(
        &app,
        window_label,
        tauri::WebviewUrl::App("index.html".into()),
    )
    .title("Repo Wizard")
    .initialization_script(&init_script)
    .inner_size(1200.0, 800.0)
    .build()?;

    Ok(())
}

#[tauri::command]
pub async fn create_new_window(app: tauri::AppHandle) -> Result<()> {
    let label = format!("main-{}", Uuid::new_v4());
    tauri::WebviewWindowBuilder::new(&app, &label, tauri::WebviewUrl::App("index.html".into()))
        .title("Repo Wizard")
        .inner_size(1200.0, 800.0)
        .build()?;
    Ok(())
}

#[tauri::command]
pub async fn close_window(window: tauri::Window) -> Result<()> {
    window.close()?;
    Ok(())
}

#[tauri::command]
pub async fn list_directory_recursive(
    path: String,
    settings: IgnoreSettings,
) -> Result<fs_utils::FileNode> {
    Ok(fs_utils::list_directory_recursive(&PathBuf::from(path), settings).await?)
}

#[tauri::command]
pub fn get_relative_path(full_path: String, root_path: String) -> Result<String> {
    Ok(path_utils::get_relative_path(
        &PathBuf::from(full_path),
        &PathBuf::from(root_path),
    )?)
}

#[tauri::command]
pub async fn read_file_as_base64(path: String) -> Result<String> {
    let bytes = fs_utils::read_file_bytes(&PathBuf::from(path)).await?;
    Ok(general_purpose::STANDARD.encode(bytes))
}

#[tauri::command]
pub async fn read_file_content(path: String) -> Result<String> {
    Ok(fs_utils::read_file_content(&PathBuf::from(path)).await?)
}

#[tauri::command]
pub async fn is_binary_file(path: String) -> Result<bool> {
    Ok(fs_utils::is_binary(&PathBuf::from(path)).await?)
}

#[tauri::command]
pub async fn write_file_content(path: String, content: String) -> Result<()> {
    fs_utils::write_file_content(&PathBuf::from(path), &content).await?;
    Ok(())
}

#[tauri::command]
pub async fn apply_patch(file_path: String, patch_str: String) -> Result<()> {
    patcher::apply_patch(&PathBuf::from(file_path), &patch_str).await?;
    Ok(())
}

#[tauri::command]
pub async fn delete_file(file_path: String) -> Result<()> {
    fs_utils::delete_file(&PathBuf::from(file_path)).await?;
    Ok(())
}

#[tauri::command]
pub async fn move_file(from: String, to: String) -> Result<()> {
    fs_utils::move_file(&PathBuf::from(from), &PathBuf::from(to)).await?;
    Ok(())
}

#[tauri::command]
pub async fn backup_files(root_path: String, file_paths: Vec<String>) -> Result<String> {
    let root = PathBuf::from(root_path);
    let paths = file_paths.into_iter().map(PathBuf::from).collect();
    Ok(fs_utils::backup_files(&root, paths).await?)
}

#[tauri::command]
pub async fn revert_file_from_backup(
    root_path: String,
    backup_id: String,
    relative_path: String,
) -> Result<()> {
    fs_utils::revert_file_from_backup(
        &PathBuf::from(root_path),
        &backup_id,
        &PathBuf::from(relative_path),
    )
    .await?;
    Ok(())
}

#[tauri::command]
pub async fn read_file_from_backup(backup_id: String, relative_path: String) -> Result<String> {
    Ok(fs_utils::read_file_from_backup(&backup_id, &PathBuf::from(relative_path)).await?)
}

#[tauri::command]
pub async fn delete_backup(backup_id: String) -> Result<()> {
    fs_utils::delete_backup(&backup_id).await?;
    Ok(())
}

#[tauri::command]
pub async fn parse_changes_from_markdown(markdown: String) -> Result<Vec<parser::ChangeOperation>> {
    Ok(parser::parse_changes_from_markdown(&markdown)?)
}

#[tauri::command]
pub async fn is_git_repository(path: String) -> Result<bool> {
    Ok(git_utils::is_git_repository(&PathBuf::from(path))?)
}

#[tauri::command]
pub async fn get_git_status(repo_path: String) -> Result<git_utils::GitStatus> {
    Ok(git_utils::get_git_status(&PathBuf::from(repo_path))?)
}

#[tauri::command]
pub async fn get_recent_commits(repo_path: String, count: u32) -> Result<Vec<git_utils::Commit>> {
    Ok(git_utils::get_recent_commits(
        &PathBuf::from(repo_path),
        count,
    )?)
}

#[tauri::command]
pub async fn get_git_diff(repo_path: String, option: git_utils::DiffOption) -> Result<String> {
    Ok(git_utils::get_git_diff(&PathBuf::from(repo_path), option)?)
}

#[tauri::command]
pub async fn resolve_path(path: String) -> Result<String> {
    Ok(path_utils::resolve_path(&path)?)
}

#[tauri::command]
pub async fn start_pty_session(
    root_path: String,
    command: Option<String>,
    on_event: Channel<CommandStreamPayload>,
) -> Result<()> {
    pty_utils::start_pty_session(&PathBuf::from(root_path), command, on_event).await?;
    Ok(())
}

#[tauri::command]
pub async fn resize_pty(rows: u16, cols: u16) -> Result<()> {
    pty_utils::resize_pty(rows, cols)?;
    Ok(())
}

#[tauri::command]
pub async fn write_to_pty(text: String) -> Result<()> {
    pty_utils::write_to_pty(text).await?;
    Ok(())
}

#[tauri::command]
pub async fn kill_pty() -> Result<()> {
    pty_utils::kill_pty()?;
    Ok(())
}

#[tauri::command]
pub async fn get_cli_status() -> Result<cli_utils::CliStatusResult> {
    Ok(cli_utils::get_cli_status())
}