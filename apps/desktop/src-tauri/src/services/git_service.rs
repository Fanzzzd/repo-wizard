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
        DiffOption::Workspace => {
            // Get tracked changes (staged + unstaged)
            let tracked_diff = run_git_command(repo_path, &["diff", "HEAD"])?;

            // Get all untracked files (git handles recursion for us)
            let untracked_files =
                run_git_command(repo_path, &["ls-files", "--others", "--exclude-standard"])?;

            let mut untracked_diff = String::new();
            for file_path in untracked_files.lines() {
                let full_path = repo_path.join(file_path);
                if let Ok(content) = std::fs::read_to_string(&full_path) {
                    // Generate diff header
                    untracked_diff.push_str(&format!("diff --git a/{0} b/{0}\n", file_path));
                    untracked_diff.push_str("new file mode 100644\n");
                    untracked_diff.push_str("--- /dev/null\n");
                    untracked_diff.push_str(&format!("+++ b/{}\n", file_path));

                    // Generate diff content
                    let lines: Vec<&str> = content.lines().collect();
                    if !lines.is_empty() {
                        untracked_diff.push_str(&format!("@@ -0,0 +1,{} @@\n", lines.len()));
                        for line in lines {
                            untracked_diff.push_str(&format!("+{}\n", line));
                        }
                    }
                }
            }

            // Combine results
            match (tracked_diff.is_empty(), untracked_diff.is_empty()) {
                (true, true) => Ok(String::new()),
                (true, false) => Ok(untracked_diff),
                (false, true) => Ok(tracked_diff),
                (false, false) => Ok(format!("{}\n{}", tracked_diff, untracked_diff)),
            }
        }
        DiffOption::Commit { hash } => run_git_command(repo_path, &["show", &hash]),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;

    #[test]
    fn test_workspace_diff_includes_untracked() {
        // Use the repo-wizard repo itself for testing
        let repo_path = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .parent()
            .unwrap()
            .parent()
            .unwrap()
            .parent()
            .unwrap()
            .to_path_buf();

        println!("Testing repo at: {:?}", repo_path);

        // Get workspace diff
        let result = get_git_diff(&repo_path, DiffOption::Workspace);

        match result {
            Ok(diff) => {
                println!("=== DIFF OUTPUT ===");
                println!("{}", diff);
                println!("=== END DIFF ===");

                // Check if untracked file is included
                if diff.contains("test-untracked.md") {
                    println!("✅ Untracked file detected!");
                } else {
                    println!("❌ Untracked file NOT detected");
                }

                // Check for tracked changes
                if diff.contains("git_service.rs") {
                    println!("✅ Tracked changes detected!");
                }
            }
            Err(e) => {
                println!("Error: {:?}", e);
            }
        }
    }
}
