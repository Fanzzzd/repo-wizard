use crate::types::{Commit, DiffOption, GitStatus};
use anyhow::{anyhow, Result};
use std::path::Path;
use std::process::{Command, Stdio};

fn run_git_command(cwd: &Path, args: &[&str]) -> Result<String> {
    let output = Command::new("git")
        .args(args)
        .current_dir(cwd)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .output()?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(anyhow!("git command failed: {}", stderr));
    }

    Ok(String::from_utf8_lossy(&output.stdout).to_string())
}

pub fn is_git_repository(path: &Path) -> Result<bool> {
    let output = Command::new("git")
        .args(["rev-parse", "--is-inside-work-tree"])
        .current_dir(path)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .output()?;
    Ok(output.status.success())
}

pub fn get_git_status(repo_path: &Path) -> Result<GitStatus> {
    let output = run_git_command(repo_path, &["status", "--porcelain"])?;
    let mut status = GitStatus {
        has_staged_changes: false,
        has_unstaged_changes: false,
    };
    for line in output.lines() {
        if let Some(first_char) = line.chars().next() {
            if "MADRC".contains(first_char) {
                status.has_staged_changes = true;
            }
        }
        if line.len() > 1 {
            if let Some(second_char) = line.chars().nth(1) {
                if "MD".contains(second_char) {
                    status.has_unstaged_changes = true;
                }
            }
        }
    }
    Ok(status)
}

pub fn get_recent_commits(repo_path: &Path, count: u32) -> Result<Vec<Commit>> {
    let log_format = "--pretty=format:%H%x1F%s%x1F%an%x1F%ar";
    let output = run_git_command(repo_path, &["log", "-n", &count.to_string(), log_format])?;

    let commits = output
        .lines()
        .filter_map(|line| {
            let parts: Vec<&str> = line.split('\x1F').collect();
            if parts.len() == 4 {
                Some(Commit {
                    hash: parts[0].to_string(),
                    message: parts[1].to_string(),
                    author: parts[2].to_string(),
                    date: parts[3].to_string(),
                })
            } else {
                None
            }
        })
        .collect();

    Ok(commits)
}

pub fn get_git_diff(repo_path: &Path, option: DiffOption) -> Result<String> {
    match option {
        DiffOption::Staged => run_git_command(repo_path, &["diff", "--staged"]),
        DiffOption::Unstaged => run_git_command(repo_path, &["diff"]),
        DiffOption::Commit { hash } => run_git_command(repo_path, &["show", &hash]),
    }
}