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
            parser::IntermediateOperation::Modify { file_path, .. }
            | parser::IntermediateOperation::Rewrite { file_path, .. } => {
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
        let mut last_op_type_is_modify = false;

        for op in ops {
            match op {
                parser::IntermediateOperation::Modify {
                    search_replace_blocks,
                    is_new_file,
                    ..
                } => {
                    let mut content_str = String::from_utf8_lossy(&current_content).to_string();

                    for (search_block, replace_block) in search_replace_blocks {
                        let normalized_search_block = search_block.replace("\r\n", "\n");
                        let normalized_content_str = content_str.replace("\r\n", "\n");

                        if normalized_content_str.contains(&normalized_search_block) {
                            content_str = normalized_content_str.replacen(
                                &normalized_search_block,
                                &replace_block,
                                1,
                            );
                        } else {
                            return Err(anyhow!(
                                "Could not apply modification to '{}': search block not found.",
                                file_path
                            ));
                        }
                    }
                    current_content = content_str.into_bytes();
                    if is_new_file {
                        is_new_file_flag = true;
                    }
                    last_op_type_is_modify = true;
                }
                parser::IntermediateOperation::Rewrite {
                    content,
                    is_new_file,
                    ..
                } => {
                    current_content = content.into_bytes();
                    if is_new_file {
                        is_new_file_flag = true;
                    }
                    last_op_type_is_modify = false;
                }
                _ => {}
            }
        }

        let final_content = String::from_utf8(current_content)?;

        if last_op_type_is_modify {
            processed_ops.push(ChangeOperation::Modify {
                file_path,
                content: final_content,
                is_new_file: is_new_file_flag,
            });
        } else {
            processed_ops.push(ChangeOperation::Rewrite {
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
