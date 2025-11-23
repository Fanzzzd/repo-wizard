#[cfg(test)]
mod tests {
    use repo_wizard::services::review_service;
    use repo_wizard::types::ChangeOperation;
    use std::fs;
    use tempfile::tempdir;
    use walkdir::WalkDir;

    async fn run_inline_patch_test(
        initial_files: Vec<(&str, &str)>,
        markdown: &str,
        expected_files: Vec<(&str, &str)>,
    ) {
        // 1. Setup temp dir
        let temp_dir = tempdir().expect("Failed to create temp dir");
        let temp_path = temp_dir.path();

        // 2. Create initial files
        for (rel_path, content) in initial_files {
            let dest_path = temp_path.join(rel_path);
            if let Some(parent) = dest_path.parent() {
                fs::create_dir_all(parent).expect("Failed to create parent dir");
            }
            fs::write(dest_path, content).expect("Failed to write initial file");
        }

        // 3. Process changes
        let ops = review_service::process_markdown_changes(markdown, temp_path.to_str().unwrap())
            .await
            .expect("Failed to process markdown changes");

        // 4. Apply changes (simulate)
        for op in ops {
            match op {
                ChangeOperation::Patch {
                    file_path, content, ..
                }
                | ChangeOperation::Overwrite {
                    file_path, content, ..
                } => {
                    let dest_path = temp_path.join(file_path);
                    if let Some(parent) = dest_path.parent() {
                        fs::create_dir_all(parent).expect("Failed to create parent dir");
                    }
                    fs::write(dest_path, content).expect("Failed to write file");
                }
                ChangeOperation::Delete { file_path } => {
                    let dest_path = temp_path.join(file_path);
                    if dest_path.exists() {
                        fs::remove_file(dest_path).expect("Failed to remove file");
                    }
                }
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

        // 5. Verify expected files
        for (rel_path, expected_content) in expected_files.iter() {
            let dest_path = temp_path.join(rel_path);
            assert!(dest_path.exists(), "File {} missing in result", rel_path);
            let actual_content =
                fs::read_to_string(&dest_path).expect("Failed to read actual file");
            assert_eq!(
                actual_content, *expected_content,
                "Content mismatch for {}",
                rel_path
            );
        }

        // 6. Verify no extra files
        for entry in WalkDir::new(temp_path) {
            let entry = entry.expect("Failed to read directory entry");
            if entry.path().is_file() {
                let rel_path = entry
                    .path()
                    .strip_prefix(temp_path)
                    .unwrap()
                    .to_str()
                    .unwrap();
                if !expected_files.iter().any(|(p, _)| *p == rel_path) {
                    panic!("Extra file found: {}", rel_path);
                }
            }
        }
    }

    #[tokio::test]
    async fn test_file_operations() {
        let initial = vec![
            ("unused.rs", "pub fn unused() {}"),
            ("old_service.rs", "pub fn old() {}"),
            ("utils.rs", "pub fn helper() {}"),
            ("config.json", "{\n  \"version\": 1\n}"),
        ];
        let markdown = r#"
DELETE unused.rs
MOVE old_service.rs to new_service.rs
OVERWRITE utils.rs
```rust
pub fn helper() {
    println!("updated");
}
```
PATCH config.json
```json
<<<<<<< SEARCH
  "version": 1
=======
  "version": 2
>>>>>>> REPLACE
```
"#;
        let expected = vec![
            ("new_service.rs", "pub fn old() {}"),
            (
                "utils.rs",
                "pub fn helper() {\n    println!(\"updated\");\n}",
            ),
            ("config.json", "{\n  \"version\": 2\n}"),
        ];

        run_inline_patch_test(initial, markdown, expected).await;
    }

    #[tokio::test]
    async fn test_python_fuzzy() {
        let initial = vec![("app.py", "def main():\n    print(\"Working Hard\")")];
        let markdown = r#"
PATCH app.py
```python
<<<<<<< SEARCH
    print("Working Hard")
=======
    print("Working Hard")
    print("Hardly Working")
>>>>>>> REPLACE
```
"#;
        let expected = vec![(
            "app.py",
            "def main():\n    print(\"Working Hard\")\n    print(\"Hardly Working\")",
        )];
        run_inline_patch_test(initial, markdown, expected).await;
    }

    #[tokio::test]
    async fn test_reproduction_config_mismatch() {
        // Simulating a case where indentation doesn't match exactly but patch should still apply
        // Initial has 4 spaces, SEARCH has 2 spaces. Delta is +2? No, fuzzy match should align them.
        // If fuzzy match aligns them, it might preserve the indentation of the match.
        // Let's assume it preserves the original indentation (4 spaces).
        let initial = vec![(
            "config.ts",
            "const config = {\n    skip: true,\n    draft: true,\n};",
        )];
        let markdown = r#"
PATCH config.ts
```typescript
<<<<<<< SEARCH
  skip: true,
  draft: true,
=======
  skip: true,
  draft: true,
  tag: true,
>>>>>>> REPLACE
```
"#;
        let expected = vec![(
            "config.ts",
            "const config = {\n  skip: true,\n  draft: true,\n  tag: true,\n};\n",
        )];
        run_inline_patch_test(initial, markdown, expected).await;
    }

    #[tokio::test]
    async fn test_release_please_success() {
        let initial = vec![(
            "config.ts",
            "const config = {\n    skip: true,\n    draft: true,\n};",
        )];
        let markdown = r#"
PATCH config.ts
```typescript
<<<<<<< SEARCH
    skip: true,
    draft: true,
=======
    skip: true,
    draft: true,
    tag: true,
>>>>>>> REPLACE
```
"#;
        let expected = vec![(
            "config.ts",
            "const config = {\n    skip: true,\n    draft: true,\n    tag: true,\n};",
        )];
        run_inline_patch_test(initial, markdown, expected).await;
    }
}
