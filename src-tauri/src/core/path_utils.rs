use anyhow::{Context, Result};
use std::path::Path;

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