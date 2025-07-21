use crate::types::IgnoreSettings;
use anyhow::Result;
use notify_debouncer_full::{
    new_debouncer_opt,
    notify::{Config, RecursiveMode, RecommendedWatcher},
    DebounceEventResult,
};
#[cfg(not(target_os = "linux"))]
use notify_debouncer_full::NoCache;
#[cfg(target_os = "linux")]
use notify_debouncer_full::FileIdMap;
use once_cell::sync::Lazy;
use std::{collections::HashMap, path::Path, sync::Mutex, time::Duration};
use tauri::Emitter;
use xvc_walker::{build_ignore_patterns, IgnoreRules, MatchResult};

// Use Box<dyn> to avoid specific type constraints that differ across platforms
type WatcherType = Box<dyn std::any::Any + Send + Sync>;
type WatcherMap = Mutex<HashMap<String, WatcherType>>;
static WATCHERS: Lazy<WatcherMap> = Lazy::new(Default::default);

pub fn start_watching(
    app_handle: tauri::AppHandle,
    root_path: &Path,
    settings: IgnoreSettings,
) -> Result<()> {
    let mut watchers = WATCHERS.lock().unwrap();

    let path_str = root_path.to_string_lossy().to_string();
    if watchers.contains_key(&path_str) {
        return Ok(());
    }

    let ignore_filename = if settings.respect_gitignore {
        Some(".gitignore")
    } else {
        None
    };

    let ignore_rules = if let Some(ign_fn) = ignore_filename {
        build_ignore_patterns(&settings.custom_ignore_patterns, root_path, ign_fn)?
    } else {
        IgnoreRules::from_global_patterns(root_path, None, &settings.custom_ignore_patterns)
    };

    let event_handler_app_handle = app_handle.clone();
    let event_handler_path_str = path_str.clone();

    let event_handler = move |result: DebounceEventResult| {
        match result {
            Ok(events) => {
                if events
                    .iter()
                    .any(|event| event.paths.iter().any(|p| !matches!(ignore_rules.check(p), MatchResult::Ignore)))
                {
                    if let Err(e) = event_handler_app_handle
                        .emit("file-change-event", event_handler_path_str.clone())
                    {
                        log::error!("Failed to emit file-change-event: {}", e);
                    }
                }
            }
            Err(errors) => {
                for error in errors {
                    log::error!("File watch error: {error:?}");
                }
            }
        }
    };

    let path_to_watch = root_path.to_path_buf();
    
    #[cfg(target_os = "linux")]
    let cache = FileIdMap::new();
    #[cfg(not(target_os = "linux"))]
    let cache = NoCache;

    let mut debouncer = new_debouncer_opt::<_, RecommendedWatcher, _>(
        Duration::from_millis(300),
        None,
        event_handler,
        cache,
        Config::default(),
    )?;

    debouncer.watch(&path_to_watch, RecursiveMode::Recursive)?;
    
    // Box the debouncer to store it as Any
    watchers.insert(path_str, Box::new(debouncer));

    Ok(())
}

pub fn stop_watching(root_path: &Path) {
    let mut watchers = WATCHERS.lock().unwrap();
    if let Some(_debouncer) = watchers.remove(root_path.to_string_lossy().as_ref()) {
        // Debouncer is dropped here, which stops the watcher.
    }
}