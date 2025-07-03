use crate::IgnoreSettings;
use anyhow::{anyhow, Result};
use async_recursion::async_recursion;
use ignore::overrides::OverrideBuilder;
use ignore::WalkBuilder;
use serde::Serialize;
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use tokio::fs;
use uuid::Uuid;

#[derive(Debug, Serialize)]
pub struct FileNode {
    pub path: String,
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub children: Option<Vec<FileNode>>,
    #[serde(rename = "isDirectory")]
    pub is_directory: bool,
}

pub async fn list_directory_recursive(
    root_path: &Path,
    settings: IgnoreSettings,
) -> Result<FileNode> {
    let mut walk_builder = WalkBuilder::new(root_path);
    walk_builder
        .git_ignore(settings.respect_gitignore)
        .hidden(false);

    if !settings.custom_ignore_patterns.is_empty() {
        let mut override_builder = OverrideBuilder::new(root_path);
        for pattern in settings.custom_ignore_patterns.lines() {
            let trimmed = pattern.trim();
            if trimmed.is_empty() || trimmed.starts_with('#') {
                continue;
            }

            if let Some(unignored_pattern) = trimmed.strip_prefix('!') {
                override_builder.add(unignored_pattern)?;
            } else {
                let ignore_pattern = format!("!{}", trimmed);
                override_builder.add(&ignore_pattern)?;
            }
        }
        let overrides = override_builder.build()?;
        walk_builder.overrides(overrides);
    }

    let walker = walk_builder.build();
    let mut parent_map: HashMap<PathBuf, Vec<PathBuf>> = HashMap::new();
    let mut is_dir_map: HashMap<PathBuf, bool> = HashMap::new();

    is_dir_map.insert(root_path.to_path_buf(), true);

    for result in walker {
        let entry = match result {
            Ok(entry) => entry,
            Err(_) => continue,
        };
        let path = entry.path();
        if path == root_path {
            continue;
        }

        is_dir_map.insert(
            path.to_path_buf(),
            entry.file_type().is_some_and(|ft| ft.is_dir()),
        );

        if let Some(parent) = path.parent() {
            parent_map
                .entry(parent.to_path_buf())
                .or_default()
                .push(path.to_path_buf());
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
            path: path.to_string_lossy().to_string(),
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
}

pub async fn read_file_content(path: &PathBuf) -> Result<String> {
    fs::read_to_string(path).await.map_err(anyhow::Error::from)
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
        if !full_path.exists() {
            continue;
        }

        let backup_path = backup_root.join(&path);

        if let Some(parent) = backup_path.parent() {
            fs::create_dir_all(parent).await?;
        }
        fs::copy(&full_path, &backup_path).await?;
    }
    Ok(backup_id)
}

#[async_recursion]
async fn restore_directory_recursively(from_dir: &Path, to_dir: &Path) -> Result<()> {
    if !from_dir.is_dir() {
        return Ok(());
    }

    if !to_dir.exists() {
        fs::create_dir_all(to_dir).await?;
    }

    let mut entries = fs::read_dir(from_dir).await?;
    while let Some(entry) = entries.next_entry().await? {
        let from_path = entry.path();
        let file_name = from_path
            .file_name()
            .ok_or_else(|| anyhow!("Failed to get file name for {:?}", from_path))?;
        let to_path = to_dir.join(file_name);

        if from_path.is_dir() {
            restore_directory_recursively(&from_path, &to_path).await?;
        } else if from_path.is_file() {
            if let Some(p) = to_path.parent() {
                if !p.exists() {
                    fs::create_dir_all(p).await?;
                }
            }
            fs::copy(&from_path, &to_path).await?;
        }
    }
    Ok(())
}

pub async fn restore_state(
    root_path: &Path,
    backup_id: &str,
    files_to_delete: Vec<String>,
) -> Result<()> {
    for rel_path_str in files_to_delete {
        let path_to_delete = root_path.join(rel_path_str);
        if path_to_delete.is_file() {
            fs::remove_file(path_to_delete).await?;
        }
    }

    let backup_root = get_backup_dir(backup_id);
    if !backup_root.exists() {
        return Err(anyhow!("Backup ID not found: {}", backup_id));
    }

    restore_directory_recursively(&backup_root, root_path).await?;

    Ok(())
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
    fs::read_to_string(&backup_file_path).await.map_err(anyhow::Error::from)
}

pub async fn delete_backup(backup_id: &str) -> Result<()> {
    let backup_root = get_backup_dir(backup_id);
    if backup_root.exists() {
        fs::remove_dir_all(backup_root).await?;
    }
    Ok(())
}

pub async fn delete_all_backups() -> Result<()> {
    let backups_dir = get_backup_root_dir();
    if backups_dir.exists() {
        fs::remove_dir_all(backups_dir).await?;
    }
    Ok(())
}