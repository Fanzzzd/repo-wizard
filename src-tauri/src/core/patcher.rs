use anyhow::{anyhow, Result};
use diffy;

pub fn apply_patch_to_content(content: &[u8], patch_str: &str) -> Result<Vec<u8>> {
    let content_str = std::str::from_utf8(content)?;

    let patch = diffy::Patch::from_str(patch_str)
        .map_err(|e| anyhow!("Failed to parse patch: {}", e))?;

    let patched_string = diffy::apply(content_str, &patch)?;

    Ok(patched_string.into_bytes())
}