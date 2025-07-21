use crate::types::{FileNode, IgnoreSettings};
use anyhow::{anyhow, Result};
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use tokio::fs;
use tokio::io::AsyncReadExt;
use uuid::Uuid;
use xvc_walker::{
    build_ignore_patterns, directory_list, update_ignore_rules, IgnoreRules, MatchResult,
    PathMetadata,
};

fn normalize_path_str(p: &Path) -> String {
    p.to_string_lossy().replace('\\', "/")
}

pub async fn list_directory_recursive(
    root_path: &Path,
    settings: IgnoreSettings,
) -> Result<FileNode> {
    let root_path_owned = root_path.to_owned();
    tokio::task::spawn_blocking(move || {
        let root_path = &root_path_owned;
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

        let mut parent_map: HashMap<PathBuf, Vec<PathBuf>> = HashMap::new();
        let mut is_dir_map: HashMap<PathBuf, bool> = HashMap::new();

        is_dir_map.insert(root_path.to_path_buf(), true);

        let mut dir_stack: Vec<PathBuf> = vec![root_path.to_path_buf()];

        while let Some(current_dir) = dir_stack.pop() {
            let _ = update_ignore_rules(&current_dir, &ignore_rules);

            if let Ok(children) = directory_list(&current_dir) {
                for PathMetadata { path, metadata } in children.into_iter().flatten() {
                    if path == *root_path {
                        continue;
                    }

                    if matches!(ignore_rules.check(&path), MatchResult::Ignore) {
                        continue;
                    }

                    let is_dir = metadata.is_dir();
                    is_dir_map.insert(path.clone(), is_dir);

                    if let Some(parent) = path.parent() {
                        parent_map
                            .entry(parent.to_path_buf())
                            .or_default()
                            .push(path.clone());
                    }

                    if is_dir {
                        dir_stack.push(path);
                    }
                }
            }
        }

        fn build_tree_from_map(
            path: &Path,
            parent_map: &HashMap<PathBuf, Vec<PathBuf>>,
            is_dir_map: &HashMap<PathBuf, bool>,
        ) -> FileNode {
            let is_directory = is_dir_map.get(path).cloned().unwrap_or(false);

            let children = if is_directory {
                parent_map.get(path).map(|child_paths| {
                    let mut children_nodes: Vec<FileNode> = child_paths
                        .iter()
                        .map(|child_path| build_tree_from_map(child_path, parent_map, is_dir_map))
                        .collect();

                    children_nodes.sort_by(|a, b| {
                        if a.is_directory != b.is_directory {
                            b.is_directory.cmp(&a.is_directory)
                        } else {
                            a.name.to_lowercase().cmp(&b.name.to_lowercase())
                        }
                    });

                    children_nodes
                })
            } else {
                None
            };

            FileNode {
                path: normalize_path_str(path),
                name: path
                    .file_name()
                    .unwrap_or_default()
                    .to_string_lossy()
                    .to_string(),
                children,
                is_directory,
            }
        }

        let mut root_node = build_tree_from_map(root_path, &parent_map, &is_dir_map);

        root_node.name = root_path
            .file_name()
            .map(|s| s.to_string_lossy().to_string())
            .unwrap_or_else(|| root_path.to_string_lossy().to_string());

        Ok(root_node)
    })
    .await?
}

pub async fn read_file_content(path: &PathBuf) -> Result<String> {
    let bytes = fs::read(path).await?;
    Ok(String::from_utf8_lossy(&bytes).to_string())
}

pub async fn read_file_bytes(path: &PathBuf) -> Result<Vec<u8>> {
    fs::read(path).await.map_err(anyhow::Error::from)
}

pub async fn write_file_content(path: &PathBuf, content: &str) -> Result<()> {
    if let Some(parent) = path.parent() {
        if !parent.exists() {
            fs::create_dir_all(parent).await?;
        }
    }
    fs::write(path, content).await.map_err(anyhow::Error::from)
}

pub async fn delete_file(path: &PathBuf) -> Result<()> {
    fs::remove_file(path).await.map_err(anyhow::Error::from)
}

pub async fn move_file(from: &PathBuf, to: &PathBuf) -> Result<()> {
    if let Some(parent) = to.parent() {
        if !parent.exists() {
            fs::create_dir_all(parent).await?;
        }
    }
    fs::rename(from, to).await.map_err(anyhow::Error::from)
}

pub async fn is_binary(path: &Path) -> Result<bool> {
    let mut file = match fs::File::open(path).await {
        Ok(f) => f,
        Err(_) => return Ok(true),
    };
    let mut buffer = [0; 8000];
    let n = file.read(&mut buffer).await?;

    Ok(buffer[..n].contains(&0))
}

fn get_backup_root_dir() -> PathBuf {
    std::env::temp_dir().join("repo-wizard-backups")
}

fn get_backup_dir(backup_id: &str) -> PathBuf {
    get_backup_root_dir().join(backup_id)
}

pub async fn backup_files(root_path: &Path, paths: Vec<PathBuf>) -> Result<String> {
    let backup_id = Uuid::new_v4().to_string();
    let backup_root = get_backup_dir(&backup_id);
    fs::create_dir_all(&backup_root).await?;

    for path in paths {
        let full_path = root_path.join(&path);
        if !full_path.is_file() {
            continue;
        }

        let backup_path = backup_root.join(&path);

        if let Some(parent) = backup_path.parent() {
            if !parent.exists() {
                fs::create_dir_all(parent).await?;
            }
        }
        let content = fs::read(&full_path).await?;
        fs::write(&backup_path, &content).await?;
    }
    Ok(backup_id)
}

pub async fn revert_file_from_backup(
    root_path: &Path,
    backup_id: &str,
    relative_path: &Path,
) -> Result<()> {
    let backup_file_path = get_backup_dir(backup_id).join(relative_path);
    if !backup_file_path.exists() {
        return Err(anyhow!(
            "Backup for file {} not found in backup {}",
            relative_path.display(),
            backup_id
        ));
    }

    let dest_path = root_path.join(relative_path);
    if let Some(parent) = dest_path.parent() {
        if !parent.exists() {
            fs::create_dir_all(parent).await?;
        }
    }
    fs::copy(&backup_file_path, &dest_path).await?;
    Ok(())
}

pub async fn read_file_from_backup(backup_id: &str, relative_path: &Path) -> Result<String> {
    let backup_file_path = get_backup_dir(backup_id).join(relative_path);
    if !backup_file_path.exists() {
        return Err(anyhow!(
            "File {} not found in backup {}",
            relative_path.display(),
            backup_id
        ));
    }
    fs::read_to_string(&backup_file_path)
        .await
        .map_err(anyhow::Error::from)
}

pub async fn delete_backup(backup_id: &str) -> Result<()> {
    let backup_root = get_backup_dir(backup_id);
    if backup_root.exists() {
        fs::remove_dir_all(backup_root).await?;
    }
    Ok(())
}