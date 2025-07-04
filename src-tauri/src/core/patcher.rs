use super::fs_utils;
use anyhow::Result;
use diffy;
use std::path::PathBuf;

pub async fn apply_patch(file_path: &PathBuf, patch_str: &str) -> Result<()> {
    let original_content = if file_path.exists() {
        fs_utils::read_file_content(file_path).await?
    } else {
        String::new()
    };

    let patch = diffy::Patch::from_str(patch_str)?;
    let patched_content = diffy::apply(&original_content, &patch)?;

    fs_utils::write_file_content(file_path, &patched_content).await?;

    Ok(())
}
