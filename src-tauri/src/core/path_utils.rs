use anyhow::{Context, Result};
use std::fs;
use std::path::{Path, PathBuf};

pub fn get_relative_path(full_path: &Path, root_path: &Path) -> Result<String> {
    let relative_path = full_path.strip_prefix(root_path).with_context(|| {
        format!(
            "Failed to strip prefix '{}' from '{}'",
            root_path.display(),
            full_path.display()
        )
    })?;
    Ok(relative_path.to_string_lossy().replace('\\', "/"))
}

pub fn resolve_path(path_str: &str, cwd: Option<String>) -> Result<String> {
    let path = PathBuf::from(path_str);
    let absolute_path = if path.is_absolute() {
        path
    } else {
        let base_path = match cwd {
            Some(dir) => PathBuf::from(dir),
            None => std::env::current_dir().context("Failed to get current directory")?,
        };
        base_path.join(path)
    };

    let canonical_path = fs::canonicalize(&absolute_path)
        .with_context(|| format!("Failed to canonicalize path: {}", absolute_path.display()))?;

    Ok(canonical_path.to_string_lossy().replace('\\', "/"))
}
