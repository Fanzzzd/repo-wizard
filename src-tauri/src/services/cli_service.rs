use crate::types::{CliInstallResult, CliStatusResult};
use anyhow::{anyhow, Result};
use std::env;
use std::path::{Path, PathBuf};
use tokio::fs;
use tokio::io::AsyncWriteExt;

#[cfg(unix)]
use std::os::unix::fs::PermissionsExt;

fn get_shim_dir() -> Result<PathBuf> {
    let home_dir = env::var("HOME")
        .or_else(|_| env::var("USERPROFILE"))
        .map(PathBuf::from)
        .map_err(|_| anyhow!("Could not resolve home directory"))?;
    Ok(home_dir.join(".repo-wizard").join("bin"))
}

#[cfg(windows)]
fn get_shim_path(shim_dir: &Path) -> PathBuf {
    shim_dir.join("repowizard.cmd")
}

#[cfg(unix)]
fn get_shim_path(shim_dir: &Path) -> PathBuf {
    shim_dir.join("repowizard")
}

fn is_dir_in_path(dir: &Path) -> bool {
    if let Ok(path_var) = env::var("PATH") {
        env::split_paths(&path_var).any(|p| p == dir)
    } else {
        false
    }
}

#[cfg(unix)]
async fn add_shim_dir_to_path(shim_dir: &Path) -> Result<()> {
    if is_dir_in_path(shim_dir) {
        return Ok(());
    }

    let shell = env::var("SHELL").unwrap_or_else(|_| "sh".to_string());
    let home = env::var("HOME")
        .map(PathBuf::from)
        .map_err(|_| anyhow!("Cannot find HOME dir"))?;

    let profile_file_name;
    let export_line;

    let shim_dir_str = shim_dir.to_string_lossy();

    if shell.contains("fish") {
        profile_file_name = PathBuf::from(".config/fish/config.fish");
        export_line = format!("\nfish_add_path \"{}\"\n", shim_dir_str);
    } else {
        profile_file_name = if shell.contains("zsh") {
            PathBuf::from(".zshrc")
        } else if shell.contains("bash") {
            PathBuf::from(".bashrc")
        } else {
            PathBuf::from(".profile")
        };
        export_line = format!("\nexport PATH=\"{}:$PATH\"\n", shim_dir_str);
    };

    let profile_path = home.join(profile_file_name);

    if profile_path.exists() {
        let content = fs::read_to_string(&profile_path).await?;
        if !content.contains(&*shim_dir_str) {
            let mut file = fs::OpenOptions::new()
                .append(true)
                .open(&profile_path)
                .await?;
            file.write_all(export_line.as_bytes()).await?;
        }
    } else {
        if let Some(parent) = profile_path.parent() {
            fs::create_dir_all(parent).await?;
        }
        fs::write(&profile_path, &export_line).await?;
    }

    Ok(())
}

#[cfg(windows)]
async fn add_shim_dir_to_path(shim_dir: &Path) -> Result<()> {
    use std::process::Command;
    if is_dir_in_path(shim_dir) {
        return Ok(());
    }

    let shim_dir_str = shim_dir.to_string_lossy().to_string();
    let current_path = env::var("Path").unwrap_or_default();

    if current_path
        .to_lowercase()
        .contains(&shim_dir_str.to_lowercase())
    {
        return Ok(());
    }

    let new_path = if current_path.is_empty() {
        shim_dir_str
    } else {
        format!("{};{}", current_path, shim_dir_str)
    };

    let output = Command::new("setx").args(["Path", &new_path]).output()?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        Err(anyhow!("Failed to add to PATH using setx: {}", stderr))
    } else {
        Ok(())
    }
}

pub fn get_cli_status() -> CliStatusResult {
    if let Ok(path_var) = env::var("PATH") {
        for p in env::split_paths(&path_var) {
            if get_shim_path(&p).is_file() {
                return CliStatusResult {
                    status: "installed".to_string(),
                    error: None,
                };
            }
        }
    }

    CliStatusResult {
        status: "not_installed".to_string(),
        error: None,
    }
}

pub async fn install_cli_shim() -> Result<CliInstallResult> {
    let exe_path = env::current_exe()?;
    let exe_path_str = exe_path.to_string_lossy();

    let shim_dir = get_shim_dir()?;
    fs::create_dir_all(&shim_dir).await?;

    let shim_path = get_shim_path(&shim_dir);

    #[cfg(windows)]
    let script_content = format!(
        r#"@echo off
start "" "{}" %*"#,
        exe_path_str
    );

    #[cfg(unix)]
    let script_content = format!(
        r#"#!/bin/sh
"{}" "$@" >/dev/null 2>&1 &"#,
        exe_path_str
    );

    fs::write(&shim_path, &script_content).await?;

    #[cfg(unix)]
    {
        let perms = std::fs::Permissions::from_mode(0o755);
        fs::set_permissions(&shim_path, perms).await?;
    }

    add_shim_dir_to_path(&shim_dir).await?;

    Ok(CliInstallResult {
        message:
            "CLI 'repowizard' installed successfully. Please restart your terminal for the changes to take effect."
                .to_string(),
    })
}
