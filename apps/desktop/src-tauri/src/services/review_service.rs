use crate::core::{fs_utils, parser};
use crate::types::ChangeOperation;
use anyhow::{anyhow, Result};
use std::collections::HashMap;
use std::path::{Path, PathBuf};

pub async fn process_markdown_changes(
    markdown: &str,
    root_path: &str,
) -> Result<Vec<ChangeOperation>> {
    let intermediate_ops = parser::parse(markdown)?;
    let root_path_buf = PathBuf::from(root_path);

    let mut file_ops: HashMap<String, Vec<parser::IntermediateOperation>> = HashMap::new();
    let mut other_ops: Vec<parser::IntermediateOperation> = Vec::new();

    for op in intermediate_ops {
        match &op {
            parser::IntermediateOperation::Patch { file_path, .. }
            | parser::IntermediateOperation::Overwrite { file_path, .. } => {
                file_ops.entry(file_path.clone()).or_default().push(op);
            }
            _ => other_ops.push(op),
        }
    }

    let mut processed_ops: Vec<ChangeOperation> = Vec::new();

    for (file_path, ops) in file_ops {
        let path_buf = root_path_buf.join(&file_path);
        let mut current_content = if path_buf.exists() {
            fs_utils::read_file_bytes(&path_buf).await?
        } else {
            Vec::new()
        };

        let mut is_new_file_flag = !path_buf.exists();
        let mut last_op_type_is_patch = false;
        let mut acc_total_blocks = 0;
        let mut acc_applied_blocks = 0;

        for op in ops {
            match op {
                parser::IntermediateOperation::Patch {
                    search_replace_blocks,
                    is_new_file,
                    ..
                } => {
                    let mut content_str = String::from_utf8_lossy(&current_content).to_string();
                    acc_total_blocks += search_replace_blocks.len();

                    for (search_block, replace_block) in search_replace_blocks {
                        match apply_patch(&content_str, &search_block, &replace_block) {
                            Ok(new_content) => {
                                content_str = new_content;
                                acc_applied_blocks += 1;
                            }
                            Err(_) => {
                                // Skip if not found
                            }
                        }
                    }
                    current_content = content_str.into_bytes();
                    if is_new_file {
                        is_new_file_flag = true;
                    }
                    last_op_type_is_patch = true;
                }
                parser::IntermediateOperation::Overwrite {
                    content,
                    is_new_file,
                    ..
                } => {
                    current_content = content.into_bytes();
                    if is_new_file {
                        is_new_file_flag = true;
                    }
                    last_op_type_is_patch = false;
                    // Reset accumulators if overwritten?
                    // If we overwrite, previous patches are irrelevant or subsumed.
                    // But maybe we should keep them if the user wants to know what happened?
                    // Usually overwrite is a fresh start.
                    acc_total_blocks = 0;
                    acc_applied_blocks = 0;
                }
                _ => {}
            }
        }

        let final_content = String::from_utf8(current_content)?;

        if last_op_type_is_patch {
            processed_ops.push(ChangeOperation::Patch {
                file_path,
                content: final_content,
                is_new_file: is_new_file_flag,
                total_blocks: acc_total_blocks,
                applied_blocks: acc_applied_blocks,
            });
        } else {
            processed_ops.push(ChangeOperation::Overwrite {
                file_path,
                content: final_content,
                is_new_file: is_new_file_flag,
            });
        }
    }

    for op in other_ops {
        match op {
            parser::IntermediateOperation::Delete { file_path } => {
                processed_ops.push(ChangeOperation::Delete { file_path });
            }
            parser::IntermediateOperation::Move { from_path, to_path } => {
                processed_ops.push(ChangeOperation::Move { from_path, to_path });
            }
            _ => {}
        }
    }

    Ok(processed_ops)
}

pub async fn backup_files(root_path: &Path, paths: Vec<PathBuf>) -> Result<String> {
    fs_utils::backup_files(root_path, paths).await
}

pub async fn revert_file_from_backup(
    root_path: &Path,
    backup_id: &str,
    relative_path: &Path,
) -> Result<()> {
    fs_utils::revert_file_from_backup(root_path, backup_id, relative_path).await
}

pub async fn read_file_from_backup(backup_id: &str, relative_path: &Path) -> Result<String> {
    fs_utils::read_file_from_backup(backup_id, relative_path).await
}

pub async fn delete_backup(backup_id: &str) -> Result<()> {
    fs_utils::delete_backup(backup_id).await
}

fn apply_patch(content: &str, search: &str, replace: &str) -> Result<String> {
    let normalized_search = search.replace("\r\n", "\n");
    let normalized_content = content.replace("\r\n", "\n");

    // 1. Exact match
    if normalized_content.contains(&normalized_search) {
        return Ok(normalized_content.replacen(&normalized_search, replace, 1));
    }

    // 2. Fuzzy match (trimmed lines)
    let search_lines: Vec<&str> = normalized_search.trim().lines().map(|l| l.trim()).collect();

    if search_lines.is_empty() {
        return Err(anyhow!("Search block is empty or only whitespace"));
    }

    let content_lines: Vec<&str> = normalized_content.lines().collect();
    let content_lines_trimmed: Vec<&str> = content_lines.iter().map(|l| l.trim()).collect();

    for i in 0..=content_lines.len().saturating_sub(search_lines.len()) {
        if content_lines_trimmed[i..i + search_lines.len()] == search_lines[..] {
            // Found match at line i
            let mut new_content = String::new();

            // Append lines before match
            for line in &content_lines[..i] {
                new_content.push_str(line);
                new_content.push('\n');
            }

            // Append replacement
            new_content.push_str(replace);
            if !replace.ends_with('\n') {
                new_content.push('\n');
            }

            // Append lines after match
            for line in &content_lines[i + search_lines.len()..] {
                new_content.push_str(line);
                new_content.push('\n');
            }

            return Ok(new_content);
        }
    }

    Err(anyhow!("Search block not found"))
}
