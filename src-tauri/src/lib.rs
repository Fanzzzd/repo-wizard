mod core;

use crate::core::{fs_utils, patcher, path_utils, parser};
use base64::{engine::general_purpose, Engine as _};
use serde::Deserialize;
use std::path::PathBuf;
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
async fn open_project_window(app: tauri::AppHandle, root_path: String) -> Result<(), String> {
    let window_label = format!(
        "project-{}",
        general_purpose::URL_SAFE_NO_PAD.encode(&root_path)
    );
    if let Some(window) = app.get_webview_window(&window_label) {
        window.set_focus().map_err(|e| e.to_string())?;
        return Ok(());
    }

    let root_path_json = serde_json::to_string(&root_path).map_err(|e| e.to_string())?;
    let init_script = format!("window.__RPO_WIZ_PROJECT_ROOT__ = {};", root_path_json);

    tauri::WebviewWindowBuilder::new(
        &app,
        window_label,
        tauri::WebviewUrl::App("index.html".into()),
    )
    .title("Repo Wizard")
    .initialization_script(&init_script)
    .inner_size(1200.0, 800.0)
    .build()
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
async fn create_new_window(app: tauri::AppHandle) -> Result<(), String> {
    let label = format!("main-{}", Uuid::new_v4());
    tauri::WebviewWindowBuilder::new(&app, &label, tauri::WebviewUrl::App("index.html".into()))
        .title("Repo Wizard")
        .inner_size(1200.0, 800.0)
        .build()
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
async fn close_window(window: tauri::Window) -> Result<(), String> {
    window.close().map_err(|e| e.to_string())
}

#[tauri::command]
async fn list_directory_recursive(
    path: String,
    settings: IgnoreSettings,
) -> Result<fs_utils::FileNode, String> {
    fs_utils::list_directory_recursive(&PathBuf::from(path), settings)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_relative_path(full_path: String, root_path: String) -> Result<String, String> {
    path_utils::get_relative_path(&PathBuf::from(full_path), &PathBuf::from(root_path))
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn read_file_content(path: String) -> Result<String, String> {
    fs_utils::read_file_content(&PathBuf::from(path))
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn write_file_content(path: String, content: String) -> Result<(), String> {
    fs_utils::write_file_content(&PathBuf::from(path), &content)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn apply_patch(file_path: String, patch_str: String) -> Result<(), String> {
    patcher::apply_patch(&PathBuf::from(file_path), &patch_str)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn delete_file(file_path: String) -> Result<(), String> {
    fs_utils::delete_file(&PathBuf::from(file_path))
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn move_file(from: String, to: String) -> Result<(), String> {
    fs_utils::move_file(&PathBuf::from(from), &PathBuf::from(to))
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn backup_files(root_path: String, file_paths: Vec<String>) -> Result<String, String> {
    let root = PathBuf::from(root_path);
    let paths = file_paths.into_iter().map(PathBuf::from).collect();
    fs_utils::backup_files(&root, paths)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn revert_file_from_backup(
    root_path: String,
    backup_id: String,
    relative_path: String,
) -> Result<(), String> {
    fs_utils::revert_file_from_backup(
        &PathBuf::from(root_path),
        &backup_id,
        &PathBuf::from(relative_path),
    )
    .await
    .map_err(|e| e.to_string())
}

#[tauri::command]
async fn read_file_from_backup(backup_id: String, relative_path: String) -> Result<String, String> {
    fs_utils::read_file_from_backup(&backup_id, &PathBuf::from(relative_path))
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn delete_backup(backup_id: String) -> Result<(), String> {
    fs_utils::delete_backup(&backup_id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn parse_changes_from_markdown(markdown: String) -> Result<Vec<parser::ChangeOperation>, String> {
    parser::parse_changes_from_markdown(&markdown).map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_log::Builder::default().build())
        .plugin(tauri_plugin_http::init())
        .invoke_handler(tauri::generate_handler![
            open_project_window,
            create_new_window,
            close_window,
            list_directory_recursive,
            get_relative_path,
            read_file_content,
            write_file_content,
            apply_patch,
            delete_file,
            move_file,
            backup_files,
            revert_file_from_backup,
            read_file_from_backup,
            delete_backup,
            parse_changes_from_markdown
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
