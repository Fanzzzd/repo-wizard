use repo_wizard::services::review_service;
use repo_wizard::types::ChangeOperation;
use std::fs;
use tempfile::tempdir;

macro_rules! patch_test {
    ($name:ident, {
        initial: $initial:expr,
        patch: $patch:expr,
        expected_total: $total:expr,
        expected_applied: $applied:expr,
        should_contain: [$($contain:expr),*],
        should_not_contain: [$($not_contain:expr),*]
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
                }
                _ => panic!("Expected Patch operation"),
            }
        }
    };
}

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
    should_not_contain: []
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
    should_not_contain: ["Should not apply"]
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
    should_not_contain: ["  Line 2  "]
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
    should_not_contain: []
});
