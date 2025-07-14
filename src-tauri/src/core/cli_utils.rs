use serde::Serialize;
use std::env;
use std::path::Path;

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct CliStatusResult {
    status: String,
    executable_path: String,
    executable_dir: String,
    error: Option<String>,
}

#[cfg(windows)]
fn check_is_installed(executable_path: &Path) -> bool {
    if let Some(executable_dir) = executable_path.parent() {
        if let Ok(path_var) = env::var("PATH") {
            return env::split_paths(&path_var).any(|p| p == executable_dir);
        }
    }
    false
}

#[cfg(not(windows))]
fn check_is_installed(executable_path: &Path) -> bool {
    if let Ok(path_var) = env::var("PATH") {
        for path in env::split_paths(&path_var) {
            let cli_path = path.join("repowizard");
            if let Ok(link_target) = std::fs::read_link(&cli_path) {
                let symlink_dir = cli_path.parent().unwrap_or_else(|| Path::new(""));
                let absolute_target = if link_target.is_absolute() {
                    link_target
                } else {
                    symlink_dir.join(link_target)
                };

                if let Ok(resolved_target) = dunce::canonicalize(absolute_target) {
                    if resolved_target == *executable_path {
                        return true;
                    }
                }
            }
        }
    }
    false
}

pub fn get_cli_status() -> CliStatusResult {
    match env::current_exe() {
        Ok(exe_path) => {
            let canonical_exe_path = match dunce::canonicalize(&exe_path) {
                Ok(p) => p,
                Err(e) => {
                    return CliStatusResult {
                        status: "error".to_string(),
                        executable_path: exe_path.to_string_lossy().to_string(),
                        executable_dir: "".to_string(),
                        error: Some(format!("Failed to canonicalize executable path: {}", e)),
                    };
                }
            };

            let status = if check_is_installed(&canonical_exe_path) {
                "installed".to_string()
            } else {
                "not_installed".to_string()
            };

            let exe_dir = canonical_exe_path
                .parent()
                .unwrap_or(&canonical_exe_path)
                .to_string_lossy()
                .to_string();

            CliStatusResult {
                status,
                executable_path: exe_path.to_string_lossy().to_string(),
                executable_dir: exe_dir,
                error: None,
            }
        }
        Err(e) => CliStatusResult {
            status: "error".to_string(),
            executable_path: "".to_string(),
            executable_dir: "".to_string(),
            error: Some(format!("Failed to get current executable path: {}", e)),
        },
    }
}