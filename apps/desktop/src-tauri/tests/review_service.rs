use repo_wizard::services::review_service;
use repo_wizard::types::ChangeOperation;
use std::fs;
use std::path::Path;
use tempfile::tempdir;
use walkdir::WalkDir;

// ============================================================================
//  Helpers & Macros
// ============================================================================

// Helper to apply operations to the filesystem.
// Ideally, this should be part of the production code if the app applies changes this way.
fn apply_change_operations(temp_path: &Path, ops: Vec<ChangeOperation>) {
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
}

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

    // 4. Apply changes
    apply_change_operations(temp_path, ops);

    // 5. Verify expected files
    for (rel_path, expected_content) in expected_files.iter() {
        let dest_path = temp_path.join(rel_path);
        assert!(dest_path.exists(), "File {} missing in result", rel_path);
        let actual_content = fs::read_to_string(&dest_path).expect("Failed to read actual file");
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

macro_rules! patch_test {
    ($name:ident, {
        initial: $initial:expr,
        patch: $patch:expr,
        expected_total: $total:expr,
        expected_applied: $applied:expr,
        should_contain: [$($contain:expr),*],
        should_not_contain: [$($not_contain:expr),*]
        $(, expected_full_content: $full_content:expr)?
    }) => {
        #[tokio::test]
        async fn $name() {
            let temp_dir = tempdir().expect("Failed to create temp dir");
            let temp_path = temp_dir.path();
            let file_path = temp_path.join("test.txt");

            fs::write(&file_path, $initial).expect("Failed to write test file");

            let markdown = format!("PATCH test.txt\n```\n{}\n```", $patch);

            let result = review_service::process_markdown_changes(&markdown, temp_path.to_str().unwrap())
                .await
                .expect("Failed to process changes");

            assert_eq!(result.len(), 1, "Expected exactly one operation");

            match &result[0] {
                ChangeOperation::Patch {
                    total_blocks,
                    applied_blocks,
                    content,
                    ..
                } => {
                    assert_eq!(*total_blocks, $total, "Total blocks mismatch");
                    assert_eq!(*applied_blocks, $applied, "Applied blocks mismatch");

                    $(
                        assert!(content.contains($contain), "Content missing: {}", $contain);
                    )*

                    $(
                        assert!(!content.contains($not_contain), "Content should not contain: {}", $not_contain);
                    )*

                    $(
                        assert_eq!(content.replace("\r\n", "\n"), $full_content.replace("\r\n", "\n"), "Full content mismatch");
                    )?
                }
                _ => panic!("Expected Patch operation"),
            }
        }
    };
}

// ============================================================================
//  Tests: Full File & Directory Operations (End-to-End)
// ============================================================================

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
    // This test reproduces a scenario where indentation changes.
    // Initial content has 4 spaces.
    // The SEARCH block uses 2 spaces.
    // The REPLACE block uses 2 spaces.
    // The fuzzy matcher aligns them.
    // CURRENT BEHAVIOR: The patch is applied, and because the REPLACE block uses 2 spaces,
    // the resulting file ends up with 2 spaces for the replaced section.
    // Note: Ideally, we might want to preserve original indentation, but this test asserts current behavior.
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

#[tokio::test]
async fn test_invalid_markdown_blocks() {
    // Test that invalid blocks are ignored or handled gracefully
    let initial = vec![("test.txt", "initial content")];
    let markdown = r#"
PATCH test.txt
```
<<<<<<< SEARCH
missing
=======
replaced
>>>>>>> REPLACE
```
"#;
    // Should fail to apply patch but not crash, content remains unchanged
    let expected = vec![("test.txt", "initial content")];
    run_inline_patch_test(initial, markdown, expected).await;
}

// ============================================================================
//  Tests: Detailed Patch Logic (Parsing & Matching)
// ============================================================================

patch_test!(test_exact_match, {
    initial: "Line 1\nLine 2\nLine 3",
    patch: r#"<<<<<<< SEARCH
Line 2
=======
Line 2 Modified
>>>>>>> REPLACE"#,
    expected_total: 1,
    expected_applied: 1,
    should_contain: ["Line 2 Modified"],
    should_not_contain: [],
    expected_full_content: "Line 1\nLine 2 Modified\nLine 3"
});

patch_test!(test_partial_match, {
    initial: "Line 1\nLine 2\nLine 3",
    patch: r#"<<<<<<< SEARCH
Line 2
=======
Line 2 Modified
>>>>>>> REPLACE
<<<<<<< SEARCH
Missing
=======
Should not apply
>>>>>>> REPLACE"#,
    expected_total: 2,
    expected_applied: 1,
    should_contain: ["Line 2 Modified"],
    should_not_contain: ["Should not apply"],
    expected_full_content: "Line 1\nLine 2 Modified\nLine 3"
});

patch_test!(test_fuzzy_match, {
    initial: "Line 1\n  Line 2  \nLine 3",
    patch: r#"<<<<<<< SEARCH
Line 2
=======
Line 2 Modified
>>>>>>> REPLACE"#,
    expected_total: 1,
    expected_applied: 1,
    should_contain: ["Line 2 Modified"],
    should_not_contain: ["  Line 2  "],
    expected_full_content: "Line 1\n  Line 2 Modified  \nLine 3"
});

patch_test!(test_multiple_fuzzy_mixed, {
    initial: "A\nB\nC\nD\nE",
    patch: r#"<<<<<<< SEARCH
B
=======
B Mod
>>>>>>> REPLACE
<<<<<<< SEARCH
  D  
=======
D Mod
>>>>>>> REPLACE"#,
    expected_total: 2,
    expected_applied: 2,
    should_contain: ["B Mod", "D Mod"],
    should_not_contain: [],
    expected_full_content: "A\nB Mod\nC\nD Mod\nE\n"
});

#[tokio::test]
async fn test_malformed_patch_syntax() {
    let temp_dir = tempdir().expect("Failed to create temp dir");
    let temp_path = temp_dir.path();
    let file_path = temp_path.join("test.txt");
    let initial = "Line 1";
    fs::write(&file_path, initial).expect("Failed to write test file");

    // Missing REPLACE block
    let markdown = r#"
PATCH test.txt
```
<<<<<<< SEARCH
Line 1
=======
Line 1 Mod
```
"#;

    let result =
        review_service::process_markdown_changes(markdown, temp_path.to_str().unwrap()).await;

    if let Ok(ops) = result {
        for op in ops {
            if let ChangeOperation::Patch { total_blocks, .. } = op {
                assert_eq!(
                    total_blocks, 0,
                    "Should not find valid blocks in malformed patch"
                );
            }
        }
    }
}
