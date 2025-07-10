mod commands;
mod core;
mod error;

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
            commands::open_project_window,
            commands::create_new_window,
            commands::close_window,
            commands::list_directory_recursive,
            commands::get_relative_path,
            commands::read_file_content,
            commands::write_file_content,
            commands::apply_patch,
            commands::delete_file,
            commands::move_file,
            commands::backup_files,
            commands::revert_file_from_backup,
            commands::read_file_from_backup,
            commands::delete_backup,
            commands::parse_changes_from_markdown
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}