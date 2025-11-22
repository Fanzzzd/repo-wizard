use crate::core::path_utils;
use crate::error::Result;
use crate::services::{
    cli_service, file_search_service, git_service, project_service, pty_service, review_service,
    watcher_service,
};
use crate::types::{
    ChangeOperation, CliInstallResult, CliStatusResult, CommandStreamEvent, Commit, DiffOption,
    FileNode, GitStatus, IgnoreSettings, SearchResult,
};
use base64::{engine::general_purpose, Engine as _};
use std::path::PathBuf;
use tauri::ipc::Channel;
use tauri::Manager;
use uuid::Uuid;
use log::debug;

#[tauri::command]
pub fn open_project_window(app: tauri::AppHandle, root_path: String) -> Result<()> {
    debug!("Attempting to open project window for path: {root_path}");

    // Check registry for any existing window managing this project path
    if let Some(reg) = app.try_state::<crate::state::WindowRegistry>() {
        if let Some(label) = reg.get_label_for_project(&root_path) {
            if let Some(window) = app.get_webview_window(&label) {
                debug!("Found existing window in registry with label '{label}'. Focusing.");
                window.set_focus()?;
                return Ok(());
            }
        }
    }

    // Fallback to label-based check for windows not yet in registry
    let window_label = format!(
        "project-{}",
        general_purpose::URL_SAFE_NO_PAD.encode(&root_path)
    );
    debug!("Generated window label: {window_label}");

    if let Some(window) = app.get_webview_window(&window_label) {
        debug!("Window with label '{window_label}' already exists. Focusing.");
        window.set_focus()?;
        return Ok(());
    }

    debug!("No existing window found. Creating new window with label '{window_label}'");

    let root_path_json = serde_json::to_string(&root_path)?;
    let init_script = format!("window.__RPO_WIZ_PROJECT_ROOT__ = {root_path_json};");
    let project_name = std::path::Path::new(&root_path)
        .file_name()
        .and_then(|s| s.to_str())
        .unwrap_or(&root_path);

    let created_label = window_label.clone();
    tauri::WebviewWindowBuilder::new(
        &app,
        &created_label,
        tauri::WebviewUrl::App("index.html".into()),
    )
    .title(project_name)
    .initialization_script(&init_script)
    .inner_size(1200.0, 800.0)
    .build()?;

    if let Some(reg) = app.try_state::<crate::state::WindowRegistry>() {
        // Record that this label is now associated with a project
        debug!("Registering project '{root_path}' for new window '{created_label}'");
        reg.set_project_for_label(&created_label, Some(&root_path));
    }

    Ok(())
}

#[tauri::command]
pub fn register_window_project(window: tauri::Window, root_path: Option<String>) -> Result<()> {
    debug!(
        "Registering project for window '{}': {:?}",
        window.label(),
        root_path
    );
    if let Some(reg) = window.app_handle().try_state::<crate::state::WindowRegistry>() {
        reg.set_project_for_label(window.label(), root_path.as_deref());
    }
    Ok(())
}

#[tauri::command]
pub fn create_new_window(app: tauri::AppHandle) -> Result<()> {
    let label = format!("main-{}", Uuid::new_v4());
    debug!("Creating new blank window with label: {label}");
    tauri::WebviewWindowBuilder::new(&app, &label, tauri::WebviewUrl::App("index.html".into()))
        .title("Repo Wizard")
        .inner_size(1200.0, 800.0)
        .build()?;
    if let Some(reg) = app.try_state::<crate::state::WindowRegistry>() {
        // Mark as a blank window (no project yet)
        reg.set_project_for_label(&label, None);
    }
    Ok(())
}

#[tauri::command]
pub async fn close_window(window: tauri::Window) -> Result<()> {
    debug!("Closing window '{}' and unregistering project.", window.label());
    if let Some(reg) = window.app_handle().try_state::<crate::state::WindowRegistry>() {
        reg.set_project_for_label(window.label(), None);
    }
    window.close()?;
    Ok(())
}

#[tauri::command]
pub async fn list_directory_recursive(path: String, settings: IgnoreSettings) -> Result<FileNode> {
    Ok(project_service::list_directory_recursive(&PathBuf::from(path), settings).await?)
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
    let bytes = project_service::read_file_bytes(&PathBuf::from(path)).await?;
    Ok(general_purpose::STANDARD.encode(bytes))
}

#[tauri::command]
pub async fn read_file_content(path: String) -> Result<String> {
    Ok(project_service::read_file_content(&PathBuf::from(path)).await?)
}

#[tauri::command]
pub async fn is_binary_file(path: String) -> Result<bool> {
    Ok(project_service::is_binary(&PathBuf::from(path)).await?)
}

#[tauri::command]
pub async fn file_exists(path: String) -> Result<bool> {
    Ok(PathBuf::from(path).exists())
}

#[tauri::command]
pub async fn write_file_content(path: String, content: String) -> Result<()> {
    project_service::write_file_content(&PathBuf::from(path), &content).await?;
    Ok(())
}

#[tauri::command]
pub async fn delete_file(file_path: String) -> Result<()> {
    project_service::delete_file(&PathBuf::from(file_path)).await?;
    Ok(())
}

#[tauri::command]
pub async fn move_file(from: String, to: String) -> Result<()> {
    project_service::move_file(&PathBuf::from(from), &PathBuf::from(to)).await?;
    Ok(())
}

#[tauri::command]
pub async fn backup_files(root_path: String, file_paths: Vec<String>) -> Result<String> {
    let root = PathBuf::from(root_path);
    let paths = file_paths.into_iter().map(PathBuf::from).collect();
    Ok(review_service::backup_files(&root, paths).await?)
}

#[tauri::command]
pub async fn revert_file_from_backup(
    root_path: String,
    backup_id: String,
    relative_path: String,
) -> Result<()> {
    review_service::revert_file_from_backup(
        &PathBuf::from(root_path),
        &backup_id,
        &PathBuf::from(relative_path),
    )
    .await?;
    Ok(())
}

#[tauri::command]
pub async fn read_file_from_backup(backup_id: String, relative_path: String) -> Result<String> {
    Ok(review_service::read_file_from_backup(&backup_id, &PathBuf::from(relative_path)).await?)
}

#[tauri::command]
pub async fn delete_backup(backup_id: String) -> Result<()> {
    review_service::delete_backup(&backup_id).await?;
    Ok(())
}

#[tauri::command]
pub async fn parse_changes_from_markdown(
    markdown: String,
    root_path: String,
) -> Result<Vec<ChangeOperation>> {
    Ok(review_service::process_markdown_changes(&markdown, &root_path).await?)
}

#[tauri::command]
pub async fn is_git_repository(path: String) -> Result<bool> {
    Ok(git_service::is_git_repository(&PathBuf::from(path))?)
}

#[tauri::command]
pub async fn get_git_status(repo_path: String) -> Result<GitStatus> {
    Ok(git_service::get_git_status(&PathBuf::from(repo_path))?)
}

#[tauri::command]
pub async fn get_recent_commits(repo_path: String, count: u32) -> Result<Vec<Commit>> {
    Ok(git_service::get_recent_commits(
        &PathBuf::from(repo_path),
        count,
    )?)
}

#[tauri::command]
pub async fn get_git_diff(repo_path: String, option: DiffOption) -> Result<String> {
    Ok(git_service::get_git_diff(
        &PathBuf::from(repo_path),
        option,
    )?)
}

#[tauri::command]
pub async fn resolve_path(path: String, cwd: Option<String>) -> Result<String> {
    Ok(path_utils::resolve_path(&path, cwd)?)
}

#[tauri::command]
pub async fn start_pty_session(
    root_path: String,
    command: Option<String>,
    on_event: Channel<CommandStreamEvent>,
) -> Result<()> {
    pty_service::start_pty_session(&PathBuf::from(root_path), command, on_event).await?;
    Ok(())
}

#[tauri::command]
pub async fn resize_pty(rows: u16, cols: u16) -> Result<()> {
    pty_service::resize_pty(rows, cols)?;
    Ok(())
}

#[tauri::command]
pub async fn write_to_pty(text: String) -> Result<()> {
    pty_service::write_to_pty(text).await?;
    Ok(())
}

#[tauri::command]
pub async fn kill_pty() -> Result<()> {
    pty_service::kill_pty()?;
    Ok(())
}

#[tauri::command]
pub async fn get_cli_status() -> Result<CliStatusResult> {
    Ok(cli_service::get_cli_status())
}

#[tauri::command]
pub async fn install_cli_shim() -> Result<CliInstallResult> {
    Ok(cli_service::install_cli_shim().await?)
}

#[tauri::command]
pub async fn start_watching(
    app_handle: tauri::AppHandle,
    root_path: String,
    settings: IgnoreSettings,
) -> Result<()> {
    watcher_service::start_watching(app_handle, &PathBuf::from(root_path), settings)?;
    Ok(())
}

#[tauri::command]
pub async fn stop_watching(root_path: String) -> Result<()> {
    watcher_service::stop_watching(&PathBuf::from(root_path));
    Ok(())
}

#[tauri::command]
pub async fn search_files(
    query: String,
    root_path: String,
    settings: IgnoreSettings,
    limit: Option<usize>,
) -> Result<Vec<SearchResult>> {
    Ok(
        file_search_service::search_files(&PathBuf::from(root_path), &query, settings, limit)
            .await?,
    )
}