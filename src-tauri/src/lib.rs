mod commands;
mod core;
mod error;
mod state;
mod services;
mod types;

use tauri::{Emitter, Manager};
use tauri_plugin_cli::CliExt;
use tauri_plugin_log::{Builder as LogBuilder, Target};
use log::{debug, error, warn};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    #[derive(Clone, serde::Serialize)]
    struct SingleInstancePayload {
        args: Vec<String>,
        cwd: String,
    }

    tauri::Builder::default()
        .manage(state::WindowRegistry::default())
        .plugin(tauri_plugin_single_instance::init(|app, argv, cwd| {
            debug!(
                "Single instance activated. Args: {:?}, CWD: {:?}",
                argv,
                cwd
            );

            // Emit event for potential listeners (kept for compatibility)
            app.emit(
                "single-instance",
                SingleInstancePayload {
                    args: argv.clone(),
                    cwd: cwd.clone(),
                },
            )
            .unwrap();

            // Also centrally handle CLI open here to avoid frontend duplication
            let app_handle = app.clone();
            let argv_clone = argv.clone();
            let cwd_clone = cwd.clone();
            // Defer execution to the main thread's event loop to prevent race conditions
            app.run_on_main_thread(move || {
                if let Some(path_arg) = argv_clone.get(1).cloned() {
                    debug!("(Main thread) CLI invocation with path argument: {}", path_arg);
                    tauri::async_runtime::spawn(async move {
                        let absolute_path =
                            crate::core::path_utils::resolve_path(&path_arg, Some(cwd_clone)).unwrap_or(path_arg);
                        debug!("(Main thread) Resolved path to: {}", absolute_path);
                        if let Err(e) = crate::commands::open_project_window(app_handle, absolute_path) {
                            error!("(Main thread) Failed to open project window: {}", e);
                        }
                    });
                } else {
                    debug!("(Main thread) CLI invocation without path argument. Focusing or creating a blank window.");
                    // No path: focus a blank window if available, otherwise create a new blank one
                    if let Some(reg) = app_handle.try_state::<state::WindowRegistry>() {
                        if let Some(label) = reg.first_blank_window_label() {
                            debug!("(Main thread) Found blank window with label: {}. Focusing.", label);
                            if let Some(win) = app_handle.get_webview_window(&label) {
                                if let Err(e) = win.set_focus() {
                                    error!("(Main thread) Failed to focus window {}: {}", label, e);
                                }
                                return;
                            } else {
                               warn!("(Main thread) Window registry had label '{}' but window was not found.", label);
                            }
                        }
                    }
                    debug!("(Main thread) No blank window found. Creating a new one.");
                    if let Err(e) = crate::commands::create_new_window(app_handle) {
                        error!("(Main thread) Failed to create new blank window: {}", e);
                    }
                }
            }).unwrap();
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
            LogBuilder::new()
                .level(if cfg!(debug_assertions) {
                    // In dev, allow verbose logs; actual level controlled by RUST_LOG if set
                    log::LevelFilter::Trace
                } else {
                    log::LevelFilter::Info
                })
                .targets([
                    Target::new(tauri_plugin_log::TargetKind::LogDir { file_name: None }),
                    Target::new(tauri_plugin_log::TargetKind::Stdout),
                    Target::new(tauri_plugin_log::TargetKind::Webview),
                ])
                .build(),
        )
        .plugin(tauri_plugin_http::init())
        .setup(|app| {
            let handle = app.handle().clone();
            match app.cli().matches() {
                Ok(matches) => {
                    if let Some(path_arg) = matches.args.get("path").and_then(|arg| arg.value.as_str()) {
                        debug!("Initial launch with path arg: {}", path_arg);
                        
                        if let Some(main_window) = handle.get_webview_window("main") {
                            let _ = main_window.close();
                        }
        
                        let path_arg_clone = path_arg.to_string();
                        let cwd = std::env::current_dir().ok().and_then(|p| p.to_string_lossy().to_string().into());
                        let absolute_path = crate::core::path_utils::resolve_path(&path_arg_clone, cwd).unwrap_or(path_arg_clone);
                        
                        if let Err(e) = crate::commands::open_project_window(handle, absolute_path) {
                            error!("Failed to open project window on startup: {}", e);
                        }
                    } else {
                        debug!("Initial launch with no path arg. Showing main window.");
                        if let Some(main_window) = handle.get_webview_window("main") {
                            let _ = main_window.show();
                            if let Some(reg) = handle.try_state::<state::WindowRegistry>() {
                                reg.set_project_for_label("main", None);
                            }
                        } else {
                            // Fallback if main window isn't there for some reason
                            if let Err(e) = crate::commands::create_new_window(handle) {
                                error!("Failed to create blank window on startup: {}", e);
                            }
                        }
                    }
                }
                Err(e) => {
                    error!("Error getting CLI matches: {}. Opening blank window.", e);
                    if let Some(main_window) = handle.get_webview_window("main") {
                        let _ = main_window.show();
                        if let Some(reg) = handle.try_state::<state::WindowRegistry>() {
                            reg.set_project_for_label("main", None);
                        }
                    }
                }
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::open_project_window,
            commands::create_new_window,
            commands::register_window_project,
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
            commands::stop_watching,
            commands::search_files
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}