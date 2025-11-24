use indoc::indoc;
use repo_wizard::services::review_service;
use repo_wizard::types::ChangeOperation;
use similar_asserts::assert_eq;
use std::fs;
use std::path::{Path, PathBuf};
use tempfile::tempdir;
use walkdir::WalkDir;

// ============================================================================
//  Helpers
// ============================================================================

// Helper to apply operations to the filesystem.
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

fn copy_dir_all(src: impl AsRef<Path>, dst: impl AsRef<Path>) -> std::io::Result<()> {
    fs::create_dir_all(&dst)?;
    for entry in fs::read_dir(src)? {
        let entry = entry?;
        let ty = entry.file_type()?;
        if ty.is_dir() {
            copy_dir_all(entry.path(), dst.as_ref().join(entry.file_name()))?;
        } else {
            fs::copy(entry.path(), dst.as_ref().join(entry.file_name()))?;
        }
    }
    Ok(())
}

fn assert_dirs_equal(actual: &Path, expected: &Path) {
    // 1. Check that all files in `expected` exist in `actual` and match content
    for entry in WalkDir::new(expected) {
        let entry = entry.expect("Failed to read expected dir entry");
        let rel_path = entry
            .path()
            .strip_prefix(expected)
            .expect("Failed to strip prefix");

        if rel_path.as_os_str().is_empty() {
            continue;
        }

        let actual_path = actual.join(rel_path);

        if entry.file_type().is_dir() {
            assert!(
                actual_path.exists(),
                "Missing directory: {}",
                rel_path.display()
            );
        } else {
            assert!(actual_path.exists(), "Missing file: {}", rel_path.display());

            let expected_content = fs::read_to_string(entry.path())
                .unwrap_or_else(|_| panic!("Failed to read expected file: {}", rel_path.display()));
            let actual_content = fs::read_to_string(&actual_path)
                .unwrap_or_else(|_| panic!("Failed to read actual file: {}", rel_path.display()));

            // Normalize line endings for comparison
            assert_eq!(
                expected_content.replace("\r\n", "\n"),
                actual_content.replace("\r\n", "\n"),
                "Content mismatch for {}",
                rel_path.display()
            );
        }
    }

    // 2. Check that there are no extra files in `actual`
    for entry in WalkDir::new(actual) {
        let entry = entry.expect("Failed to read actual dir entry");
        let rel_path = entry
            .path()
            .strip_prefix(actual)
            .expect("Failed to strip prefix");

        if rel_path.as_os_str().is_empty() {
            continue;
        }

        let expected_path = expected.join(rel_path);
        assert!(
            expected_path.exists(),
            "Extra file found in result: {}",
            rel_path.display()
        );
    }
}

async fn run_fixture_case(case_name: &str) {
    let fixture_root = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("tests/review_service/fixtures")
        .join(case_name);

    let input_dir = fixture_root.join("input");
    let expected_dir = fixture_root.join("expected");
    let patch_path = fixture_root.join("patch.md");

    assert!(input_dir.exists(), "Input dir missing: {:?}", input_dir);
    assert!(
        expected_dir.exists(),
        "Expected dir missing: {:?}",
        expected_dir
    );
    assert!(patch_path.exists(), "Patch file missing: {:?}", patch_path);

    // 1. Setup temp dir and copy input files
    let temp_dir = tempdir().expect("Failed to create temp dir");
    let temp_path = temp_dir.path();
    copy_dir_all(&input_dir, temp_path).expect("Failed to copy input files");

    // 2. Read patch and process
    let markdown = fs::read_to_string(&patch_path).expect("Failed to read patch.md");
    let ops = review_service::process_markdown_changes(&markdown, temp_path.to_str().unwrap())
        .await
        .expect("Failed to process markdown changes");

    // 3. Apply changes
    apply_change_operations(temp_path, ops);

    // 4. Verify results
    assert_dirs_equal(temp_path, &expected_dir);
}

// ============================================================================
//  Tests: End-to-End Fixtures
// ============================================================================

#[tokio::test]
async fn test_file_operations() {
    run_fixture_case("file_operations").await;
}

#[tokio::test]
async fn test_python_fuzzy() {
    run_fixture_case("python_fuzzy").await;
}

#[tokio::test]
async fn test_reproduction_config_mismatch() {
    run_fixture_case("reproduction_config_mismatch").await;
}

#[tokio::test]
async fn test_release_please_success() {
    run_fixture_case("release_please_success").await;
}

#[tokio::test]
async fn test_invalid_markdown_blocks() {
    run_fixture_case("invalid_markdown_blocks").await;
}

// ============================================================================
//  Tests: Detailed Patch Logic (Unit Tests)
// ============================================================================

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

            let markdown = format!("PATCH test.txt\n```\n{}\n```\n", $patch);

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

patch_test!(test_exact_match, {
    initial: indoc! {"
        Line 1
        Line 2
        Line 3
    "},
    patch: indoc! {"
        <<<<<<< SEARCH
        Line 2
        =======
        Line 2 Modified
        >>>>>>> REPLACE
    "},
    expected_total: 1,
    expected_applied: 1,
    should_contain: ["Line 2 Modified"],
    should_not_contain: [],
    expected_full_content: indoc! {"
        Line 1
        Line 2 Modified
        Line 3
    "}
});

patch_test!(test_partial_match, {
    initial: indoc! {"
        Line 1
        Line 2
        Line 3
    "},
    patch: indoc! {"
        <<<<<<< SEARCH
        Line 2
        =======
        Line 2 Modified
        >>>>>>> REPLACE
        <<<<<<< SEARCH
        Missing
        =======
        Should not apply
        >>>>>>> REPLACE
    "},
    expected_total: 2,
    expected_applied: 1,
    should_contain: ["Line 2 Modified"],
    should_not_contain: ["Should not apply"],
    expected_full_content: indoc! {"
        Line 1
        Line 2 Modified
        Line 3
    "}
});

patch_test!(test_fuzzy_match, {
    initial: indoc! {"
        Line 1
          Line 2  
        Line 3
    "},
    patch: indoc! {"
        <<<<<<< SEARCH
        Line 2
        =======
        Line 2 Modified
        >>>>>>> REPLACE
    "},
    expected_total: 1,
    expected_applied: 1,
    should_contain: ["Line 2 Modified"],
    should_not_contain: ["  Line 2  "],
    expected_full_content: indoc! {"
        Line 1
          Line 2 Modified  
        Line 3
    "}
});

patch_test!(test_multiple_fuzzy_mixed, {
    initial: indoc! {"
        A
        B
        C
        D
        E
    "},
    patch: indoc! {"
        <<<<<<< SEARCH
        B
        =======
        B Mod
        >>>>>>> REPLACE
        <<<<<<< SEARCH
          D  
        =======
        D Mod
        >>>>>>> REPLACE
    "},
    expected_total: 2,
    expected_applied: 2,
    should_contain: ["B Mod", "D Mod"],
    should_not_contain: [],
    expected_full_content: indoc! {"
        A
        B Mod
        C
        D Mod
        E
    "}
});

#[tokio::test]
async fn test_malformed_patch_syntax() {
    let temp_dir = tempdir().expect("Failed to create temp dir");
    let temp_path = temp_dir.path();
    let file_path = temp_path.join("test.txt");
    let initial = "Line 1";
    fs::write(&file_path, initial).expect("Failed to write test file");

    // Missing REPLACE block
    let markdown = indoc! {"
        PATCH test.txt
        ```
        <<<<<<< SEARCH
        Line 1
        =======
        Line 1 Mod
        ```
    "};

    let result =
        review_service::process_markdown_changes(markdown, temp_path.to_str().unwrap()).await;

    let ops = result.expect("Should not error on malformed patch");
    assert_eq!(
        ops.len(),
        0,
        "Should return 0 operations for malformed patch"
    );
}
