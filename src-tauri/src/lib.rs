mod commands;
mod core;
mod error;
mod services;
mod types;

use tauri::Emitter;
use tauri_plugin_log::{Builder as LogBuilder, Target, TargetKind};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    #[derive(Clone, serde::Serialize)]
    struct SingleInstancePayload {
        args: Vec<String>,
        cwd: String,
    }

    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, argv, cwd| {
            app.emit("single-instance", SingleInstancePayload { args: argv, cwd })
                .unwrap();
        }))
        .plugin(tauri_plugin_cli::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(
            LogBuilder::default()
                .target(Target::new(TargetKind::LogDir {
                    file_name: Some("repo-wizard".to_string()),
                }))
                .target(Target::new(TargetKind::Webview))
                .build(),
        )
        .plugin(tauri_plugin_http::init())
        .invoke_handler(tauri::generate_handler![
            commands::open_project_window,
            commands::create_new_window,
            commands::close_window,
            commands::list_directory_recursive,
            commands::get_relative_path,
            commands::read_file_content,
            commands::read_file_as_base64,
            commands::is_binary_file,
            commands::write_file_content,
            commands::delete_file,
            commands::move_file,
            commands::backup_files,
            commands::revert_file_from_backup,
            commands::read_file_from_backup,
            commands::delete_backup,
            commands::parse_changes_from_markdown,
            commands::is_git_repository,
            commands::get_git_status,
            commands::get_recent_commits,
            commands::get_git_diff,
            commands::resolve_path,
            commands::start_pty_session,
            commands::resize_pty,
            commands::write_to_pty,
            commands::kill_pty,
            commands::get_cli_status,
            commands::install_cli_shim,
            commands::start_watching,
            commands::stop_watching
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
