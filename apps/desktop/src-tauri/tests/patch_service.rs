#[cfg(test)]
mod tests {
    use repo_wizard::services::review_service;
    use repo_wizard::types::ChangeOperation;
    use std::fs;
    use std::path::{Path, PathBuf};
    use tempfile::tempdir;
    use walkdir::WalkDir;

    async fn run_patch_test(test_name: &str) {
        // 1. Setup paths
        let manifest_dir = env!("CARGO_MANIFEST_DIR");
        let test_case_dir = PathBuf::from(manifest_dir).join("tests/patch-service").join(test_name);
        let before_dir = test_case_dir.join("before");
        let after_dir = test_case_dir.join("after");
        let respond_md_path = test_case_dir.join("respond.md");

        assert!(before_dir.exists(), "before directory does not exist");
        assert!(after_dir.exists(), "after directory does not exist");
        assert!(respond_md_path.exists(), "respond.md does not exist");

        // 2. Setup temp dir and copy 'before' state
        let temp_dir = tempdir().expect("Failed to create temp dir");
        let temp_path = temp_dir.path();
        
        // Copy all files from before_dir to temp_path
        for entry in WalkDir::new(&before_dir) {
            let entry = entry.expect("Failed to read directory entry");
            let path = entry.path();
            if path.is_file() {
                let relative_path = path.strip_prefix(&before_dir).expect("Failed to strip prefix");
                let dest_path = temp_path.join(relative_path);
                if let Some(parent) = dest_path.parent() {
                    fs::create_dir_all(parent).expect("Failed to create parent dir");
                }
                fs::copy(path, &dest_path).expect("Failed to copy file");
            }
        }

        // 3. Read markdown and process changes
        let markdown = fs::read_to_string(&respond_md_path).expect("Failed to read respond.md");
        let ops = review_service::process_markdown_changes(&markdown, temp_path.to_str().unwrap())
            .await
            .expect("Failed to process markdown changes");

        // 4. Apply changes to temp dir (simulate applying the patch)
        for op in ops {
            match op {
                ChangeOperation::Patch { file_path, content, .. } |
                ChangeOperation::Overwrite { file_path, content, .. } => {
                    let dest_path = temp_path.join(file_path);
                    if let Some(parent) = dest_path.parent() {
                        fs::create_dir_all(parent).expect("Failed to create parent dir");
                    }
                    fs::write(dest_path, content).expect("Failed to write file");
                },
                ChangeOperation::Delete { file_path } => {
                    let dest_path = temp_path.join(file_path);
                    if dest_path.exists() {
                        fs::remove_file(dest_path).expect("Failed to remove file");
                    }
                },
                ChangeOperation::Move { from_path, to_path } => {
                    let src_path = temp_path.join(from_path);
                    let dest_path = temp_path.join(to_path);
                    if let Some(parent) = dest_path.parent() {
                        fs::create_dir_all(parent).expect("Failed to create parent dir");
                    }
                    fs::rename(src_path, dest_path).expect("Failed to move file");
                }
            }
        }

        // 5. Compare temp dir with 'after' dir
        for entry in WalkDir::new(&after_dir) {
            let entry = entry.expect("Failed to read directory entry");
            let path = entry.path();
            if path.is_file() {
                let relative_path = path.strip_prefix(&after_dir).expect("Failed to strip prefix");
                let actual_path = temp_path.join(relative_path);
                
                assert!(actual_path.exists(), "File {} missing in result", relative_path.display());
                
                let expected_content = fs::read_to_string(path).expect("Failed to read expected file");
                let actual_content = fs::read_to_string(&actual_path).expect("Failed to read actual file");
                
                if actual_content != expected_content {
                    println!("Mismatch for {}:", relative_path.display());
                    println!("Expected:\n{}", expected_content);
                    println!("Actual:\n{}", actual_content);
                    panic!("Content mismatch for {}", relative_path.display());
                }
            }
        }
        
        // Also check that no extra files exist in temp_path that are not in after_dir
        // (This might be too strict if temp dir has other artifacts, but for this test it should be fine)
         for entry in WalkDir::new(temp_path) {
            let entry = entry.expect("Failed to read directory entry");
            let path = entry.path();
            if path.is_file() {
                let relative_path = path.strip_prefix(temp_path).expect("Failed to strip prefix");
                let expected_path = after_dir.join(relative_path);
                assert!(expected_path.exists(), "Extra file {} found in result", relative_path.display());
            }
        }
    }

    #[tokio::test]
    async fn test_reproduction_config_mismatch() {
        run_patch_test("test4_reproduction").await;
    }

    #[tokio::test]
    async fn test_file_operations() {
        run_patch_test("test2_file_operations").await;
    }

    #[tokio::test]
    async fn test_python_fuzzy() {
        run_patch_test("test3_python_fuzzy").await;
    }

    #[tokio::test]
    async fn test_release_please_success() {
        run_patch_test("test5_release_please_success").await;
    }
}
