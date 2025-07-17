use anyhow::Result;
use notify_debouncer_full::{
    new_debouncer,
    notify::RecursiveMode,
    DebounceEventResult, Debouncer, FileIdMap,
};
use once_cell::sync::Lazy;
use std::{collections::HashMap, path::Path, sync::Mutex, time::Duration};
use tauri::Emitter;

type WatcherMap = Mutex<HashMap<String, Debouncer<notify::RecommendedWatcher, FileIdMap>>>;
static WATCHERS: Lazy<WatcherMap> = Lazy::new(Default::default);

pub fn start_watching(app_handle: tauri::AppHandle, root_path: &Path) -> Result<()> {
    let mut watchers = WATCHERS.lock().unwrap();

    let path_str = root_path.to_string_lossy().to_string();
    if watchers.contains_key(&path_str) {
        return Ok(());
    }

    let path_to_watch = root_path.to_path_buf();
    let event_handler_app_handle = app_handle.clone();
    let event_handler_path_str = path_str.clone();

    let event_handler = move |result: DebounceEventResult| match result {
        Ok(_events) => {
            if let Err(e) =
                event_handler_app_handle.emit("file-change-event", event_handler_path_str.clone())
            {
                log::error!("Failed to emit file-change-event: {}", e);
            }
        }
        Err(errors) => {
            for error in errors {
                log::error!("File watch error: {error:?}");
            }
        }
    };

    let mut debouncer = new_debouncer(Duration::from_millis(300), None, event_handler)?;

    debouncer.watch(&path_to_watch, RecursiveMode::Recursive)?;

    watchers.insert(path_str, debouncer);

    Ok(())
}

pub fn stop_watching(root_path: &Path) {
    let mut watchers = WATCHERS.lock().unwrap();
    if let Some(_debouncer) = watchers.remove(root_path.to_string_lossy().as_ref()) {
        // Debouncer is dropped here, which stops the watcher.
    }
}