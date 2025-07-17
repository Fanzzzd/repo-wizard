use crate::types::IgnoreSettings;
use anyhow::Result;
use notify_debouncer_full::{
    new_debouncer,
    notify::RecursiveMode,
    DebounceEventResult, Debouncer, FileIdMap,
};
use once_cell::sync::Lazy;
use std::{collections::HashMap, path::{Path}, sync::Mutex, time::Duration};
use tauri::Emitter;
use ignore::{WalkBuilder, overrides::OverrideBuilder};

type WatcherMap = Mutex<HashMap<String, Debouncer<notify::RecommendedWatcher, FileIdMap>>>;
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

    let path_to_watch = root_path.to_path_buf();
    let event_handler_app_handle = app_handle.clone();
    let event_handler_path_str = path_str.clone();

    let moved_settings = settings;
    let root_path_for_handler = root_path.to_path_buf();

    let event_handler = move |result: DebounceEventResult| {
        let check_path_inclusion = |path: &Path| -> bool {
            let mut path_to_check = path.to_path_buf();
            while !path_to_check.exists() {
                if let Some(parent) = path_to_check.parent() {
                    if parent == path_to_check { break; } // Reached fs root
                    path_to_check = parent.to_path_buf();
                } else {
                    return false;
                }
            }

            let mut builder = WalkBuilder::new(&path_to_check);
            builder
                .git_ignore(moved_settings.respect_gitignore)
                .hidden(false)
                .parents(true);

            if !moved_settings.custom_ignore_patterns.is_empty() {
                let mut override_builder = OverrideBuilder::new(&root_path_for_handler);
                for pattern in moved_settings.custom_ignore_patterns.lines() {
                    let trimmed = pattern.trim();
                    if !trimmed.is_empty() && !trimmed.starts_with('#') {
                        let pattern_to_add = if let Some(unignored_pattern) = trimmed.strip_prefix('!') {
                            unignored_pattern.to_string()
                        } else {
                            format!("!{}", trimmed)
                        };
                        if let Err(e) = override_builder.add(&pattern_to_add) {
                            log::warn!("Invalid custom ignore pattern '{}': {}", pattern_to_add, e);
                        }
                    }
                }
                match override_builder.build() {
                    Ok(overrides) => { builder.overrides(overrides); },
                    Err(e) => log::warn!("Failed to build custom ignore patterns: {}", e),
                }
            }
            
            builder.build().next().is_some()
        };

        match result {
            Ok(events) => {
                if events.iter().any(|event| event.paths.iter().any(|p| check_path_inclusion(p))) {
                    if let Err(e) =
                        event_handler_app_handle.emit("file-change-event", event_handler_path_str.clone())
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