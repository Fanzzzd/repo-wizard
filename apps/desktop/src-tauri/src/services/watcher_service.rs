use crate::types::IgnoreSettings;
use anyhow::Result;
use ignore::WalkBuilder;
#[cfg(target_os = "linux")]
use notify_debouncer_full::FileIdMap;
#[cfg(not(target_os = "linux"))]
use notify_debouncer_full::NoCache;
use notify_debouncer_full::{
    new_debouncer_opt,
    notify::{Config, RecommendedWatcher, RecursiveMode},
    DebounceEventResult,
};

use once_cell::sync::Lazy;
use std::{collections::HashMap, path::Path, sync::Mutex, time::Duration};
use tauri::Emitter;

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

    let event_handler_app_handle = app_handle.clone();
    let event_handler_path_str = path_str.clone();
    let event_handler_settings = settings.clone();
    let event_handler_root_path = root_path.to_path_buf();

    let event_handler = move |result: DebounceEventResult| match result {
        Ok(events) => {
            let mut has_unignored_change = false;

            'events: for event in &events {
                for p in &event.paths {
                    let candidate = if p.exists() {
                        p.to_path_buf()
                    } else {
                        p.parent()
                            .map(|parent| parent.to_path_buf())
                            .unwrap_or_else(|| event_handler_root_path.clone())
                    };

                    let mut builder = WalkBuilder::new(&event_handler_root_path);
                    builder.add(&candidate);
                    builder
                        .hidden(false)
                        .git_ignore(event_handler_settings.respect_gitignore)
                        .max_depth(Some(0));

                    if !event_handler_settings.custom_ignore_patterns.is_empty() {
                        if let Err(e) = builder.add_custom_ignore_patterns(
                            &event_handler_settings.custom_ignore_patterns,
                        ) {
                            log::error!("Failed to apply custom ignore patterns: {e}");
                        }
                    }

                    let mut path_is_unignored = false;
                    for entry in builder.build().flatten() {
                        if entry.path() == candidate {
                            path_is_unignored = true;
                            break;
                        }
                    }

                    if path_is_unignored {
                        has_unignored_change = true;
                        break 'events;
                    }
                }
            }

            if has_unignored_change {
                if let Err(e) = event_handler_app_handle
                    .emit("file-change-event", event_handler_path_str.clone())
                {
                    log::error!("Failed to emit file-change-event: {e}");
                }
            }
        }
        Err(errors) => {
            for error in errors {
                log::error!("File watch error: {error:?}");
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

    watchers.insert(path_str, Box::new(debouncer));

    Ok(())
}

pub fn stop_watching(root_path: &Path) {
    let mut watchers = WATCHERS.lock().unwrap();
    if let Some(_debouncer) = watchers.remove(root_path.to_string_lossy().as_ref()) {}
}
