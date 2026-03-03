use crate::core::path_utils;
use crate::core::token_counter;
use crate::types::{
    ComposerMode, EditFormat, FileNode, FileTreeConfig, FileTreeScope, MagicPromptType, MetaPrompt,
    PromptEstimateInput, PromptEstimateResult, PromptMode, PromptType,
};
use std::collections::HashSet;
use std::path::PathBuf;

const DIFF_FORMATTING_RULES: &str = r#"# File editing rules:

You can modify files using either search/replace blocks (for partial edits) or overwriting the entire file (for full content).

**1. Modify using search/replace blocks (Preferred for targeted changes):**
Use the `PATCH` command. Each change must be in a `<<<<<<< SEARCH ... ======= ... >>>>>>> REPLACE` block.

PATCH path/to/file.py
```
<<<<<<< SEARCH
    original_code_line_1
    original_code_line_2
=======
    new_code_line_1
    new_code_line_2
>>>>>>> REPLACE
```
* The SEARCH block must match the original code exactly, character for character (including whitespace).
* You can include multiple search/replace blocks for the same file within one fenced block.

**To create a new file:**
CREATE path/to/new_file.py
```python
// this file does not exist, it's just an example file to show you the response format
```

**To fully overwrite an existing file:**
OVERWRITE path/to/existing_file.py
```python
// this file does not exist, it's just an example file to show you the response format
```

**Other operations:**

To delete a file:
DELETE path/to/file.ext

To move or rename a file:
MOVE path/from/old.ext TO path/to/new.ext
"#;

const WHOLE_FORMATTING_RULES: &str = r#"# File editing rules:

For each file you need to modify, use a command (`CREATE` for new files, `OVERWRITE` for existing files) followed by the file path, and then the complete, updated content of the file within a fenced code block.

**To create a new file:**
CREATE path/to/new_file.py
```python
// this file does not exist, it's just an example file to show you the response format
```

**To fully overwrite an existing file:**
OVERWRITE path/to/existing_file.py
```python
// this file does not exist, it's just an example file to show you the response format
```

To delete a file, output a single line:
DELETE path/to/file.ext

To move or rename a file, output a single line:
MOVE path/from/old.ext TO path/to/new.ext
"#;

struct PromptFile {
    path: String,
}

pub async fn estimate_prompt_tokens(
    input: PromptEstimateInput,
) -> anyhow::Result<PromptEstimateResult> {
    let root_path = input.root_path.clone();
    let file_infos =
        token_counter::count_tokens_for_paths(input.selected_file_paths.clone()).await?;

    let mut missing_paths = Vec::new();
    let mut file_tokens = 0u32;
    let mut files_for_prompt = Vec::new();
    let mut selected_relative_paths = HashSet::new();

    for info in &file_infos {
        if !info.exists {
            missing_paths.push(info.path.clone());
            continue;
        }
        if info.is_binary {
            continue;
        }
        file_tokens = file_tokens.saturating_add(info.tokens);
    }

    if let Some(root_path) = root_path.as_ref() {
        for info in &file_infos {
            if !info.exists || info.is_binary {
                continue;
            }
            let relative = path_utils::get_relative_path(
                &PathBuf::from(&info.path),
                &PathBuf::from(root_path),
            )
            .unwrap_or_else(|_| info.path.clone())
            .replace('\\', "/");
            selected_relative_paths.insert(relative.clone());
            files_for_prompt.push(PromptFile { path: relative });
        }
    }

    let header = build_prompt_header(&input, &files_for_prompt, &selected_relative_paths);
    let header_tokens = token_counter::count_tokens(&header) as u32;
    let total_tokens = header_tokens.saturating_add(file_tokens);

    if log::log_enabled!(log::Level::Debug) {
        log::debug!(
            "prompt-estimate header_tokens={} file_tokens={} total_tokens={} selected={} missing={}",
            header_tokens,
            file_tokens,
            total_tokens,
            input.selected_file_paths.len(),
            missing_paths.len()
        );
    }

    Ok(PromptEstimateResult {
        total_tokens,
        missing_paths,
    })
}

fn build_prompt_header(
    input: &PromptEstimateInput,
    files: &[PromptFile],
    selected_relative_paths: &HashSet<String>,
) -> String {
    let mut prompt = String::new();
    if !input.custom_system_prompt.is_empty() {
        prompt.push_str("--- BEGIN SYSTEM PROMPT ---\n");
        prompt.push_str(&input.custom_system_prompt);
        prompt.push_str("\n--- END SYSTEM PROMPT ---\n\n");
    }

    let enabled_meta_prompts: Vec<&MetaPrompt> = input
        .meta_prompts
        .iter()
        .filter(|prompt| prompt.enabled)
        .filter(|prompt| {
            matches!(
                (&prompt.mode, &input.composer_mode),
                (PromptMode::Universal, _)
                    | (PromptMode::Edit, ComposerMode::Edit)
                    | (PromptMode::Qa, ComposerMode::Qa)
            )
        })
        .collect();

    if !enabled_meta_prompts.is_empty() {
        prompt.push_str(
            "In addition to my instructions, you must also follow the rules in these blocks:\n\n",
        );
        for meta_prompt in enabled_meta_prompts {
            let mut content = meta_prompt.content.clone();

            if meta_prompt.prompt_type == PromptType::Magic {
                if let Some(root_path) = input.root_path.as_ref() {
                    match meta_prompt.magic_type {
                        Some(MagicPromptType::FileTree) => {
                            if let Some(file_tree) = input.file_tree.as_ref() {
                                if let Some(config) = meta_prompt.file_tree_config.as_ref() {
                                    let tree = if matches!(config.scope, FileTreeScope::Selected) {
                                        filter_file_tree_by_selection(
                                            file_tree,
                                            selected_relative_paths,
                                            root_path,
                                        )
                                    } else {
                                        Some(file_tree.clone())
                                    };
                                    let tree_string = tree
                                        .as_ref()
                                        .map(|node| format_file_tree(node, Some(config)))
                                        .unwrap_or_else(|| {
                                            "No project is open or no files selected.".to_string()
                                        });
                                    content = content.replace("{FILE_TREE_CONTENT}", &tree_string);
                                }
                            }
                        }
                        Some(MagicPromptType::GitDiff) => {
                            content = content.replace(
                                "{GIT_DIFF_CONTENT}",
                                "[Git diff output will be included here during prompt generation]",
                            );
                        }
                        Some(MagicPromptType::TerminalCommand) => {
                            let output = meta_prompt
                                .terminal_command_config
                                .as_ref()
                                .and_then(|config| {
                                    if config.command.is_empty() {
                                        None
                                    } else {
                                        Some(format!(
                                            "[Output of '{}' will be captured from an interactive terminal and inserted here.]",
                                            config.command
                                        ))
                                    }
                                })
                                .unwrap_or_else(|| {
                                    "No command specified in meta-prompt configuration.".to_string()
                                });
                            content = content.replace("{TERMINAL_COMMAND_OUTPUT}", &output);
                        }
                        None => {}
                    }
                }
            }

            prompt.push_str(&format!(
                "--- BEGIN META PROMPT: \"{}\" ---\n",
                meta_prompt.name
            ));
            prompt.push_str(&content);
            prompt.push_str(&format!(
                "\n--- END META PROMPT: \"{}\" ---\n\n",
                meta_prompt.name
            ));
        }
    }

    if matches!(input.composer_mode, ComposerMode::Edit) {
        prompt.push_str("--- BEGIN File Editing Rules ---\n");
        prompt.push_str(match input.edit_format {
            EditFormat::Diff => DIFF_FORMATTING_RULES,
            EditFormat::Whole => WHOLE_FORMATTING_RULES,
        });
        prompt.push_str("\n--- END File Editing Rules ---\n\n");
    }

    prompt.push_str("--- BEGIN SELECTED CODE ---\n");
    prompt.push_str("Here are the files to work with:\n\n");
    for file in files {
        prompt.push_str(&file.path);
        prompt.push_str("\n```\n\n```\n\n");
    }
    prompt.push_str("--- END SELECTED CODE ---\n\n");
    prompt.push_str("My instructions are:\n\n");
    prompt.push_str(&input.instructions);

    if matches!(input.composer_mode, ComposerMode::Edit) {
        prompt.push_str("\n\n**IMPORTANT** IF MAKING FILE CHANGES, YOU MUST USE THE FILE EDITING FORMATS PROVIDED ABOVE – IT IS THE ONLY WAY FOR YOUR CHANGES TO BE APPLIED.");
    }

    prompt
}

fn parse_ignore_patterns(patterns_str: &str) -> Box<dyn Fn(&FileNode) -> bool> {
    let patterns: Vec<String> = patterns_str
        .split(',')
        .map(|pattern| pattern.trim().to_string())
        .filter(|pattern| !pattern.is_empty())
        .collect();

    type NameMatcher = Box<dyn Fn(&str) -> bool>;
    let mut file_patterns: Vec<NameMatcher> = Vec::new();
    let mut dir_patterns: Vec<NameMatcher> = Vec::new();

    for pattern in patterns {
        if pattern.ends_with('/') {
            let dir_name = pattern.trim_end_matches('/').to_string();
            dir_patterns.push(Box::new(move |name| name == dir_name));
        } else if let Some(extension) = pattern.strip_prefix("*.") {
            let ext = format!(".{extension}");
            file_patterns.push(Box::new(move |name| name.ends_with(&ext)));
        } else {
            let value = pattern.clone();
            file_patterns.push(Box::new(move |name| name == value));
            let value = pattern;
            dir_patterns.push(Box::new(move |name| name == value));
        }
    }

    Box::new(move |node: &FileNode| {
        let patterns_to_check = if node.is_directory {
            &dir_patterns
        } else {
            &file_patterns
        };
        patterns_to_check.iter().any(|matcher| matcher(&node.name))
    })
}

fn format_file_tree(node: &FileNode, config: Option<&FileTreeConfig>) -> String {
    let mut result = format!("{}\n", node.name);
    let is_ignored = config
        .map(|cfg| parse_ignore_patterns(&cfg.ignore_patterns))
        .unwrap_or_else(|| Box::new(|_: &FileNode| false));
    let max_files = config.and_then(|cfg| cfg.max_files_per_directory);

    fn build_tree(
        children: &[FileNode],
        prefix: &str,
        result: &mut String,
        is_ignored: &dyn Fn(&FileNode) -> bool,
        max_files: Option<i32>,
    ) {
        let mut children_to_display: Vec<FileNode> = children
            .iter()
            .filter(|child| !is_ignored(child))
            .cloned()
            .collect();

        if let Some(max_files) = max_files {
            if max_files >= 0 && children_to_display.len() > max_files as usize {
                let truncated: Vec<FileNode> = children_to_display
                    .into_iter()
                    .take(max_files as usize)
                    .collect();
                let ellipsis_node = FileNode {
                    name: "...".to_string(),
                    path: String::new(),
                    is_directory: false,
                    children: None,
                };
                children_to_display = truncated
                    .into_iter()
                    .chain(std::iter::once(ellipsis_node))
                    .collect();
            }
        }

        for (index, child) in children_to_display.iter().enumerate() {
            let is_last = index == children_to_display.len() - 1;
            result.push_str(prefix);
            result.push_str(if is_last { "└── " } else { "├── " });
            result.push_str(&child.name);
            result.push('\n');

            if let Some(grandchildren) = child.children.as_ref() {
                if child.name != "..." {
                    let next_prefix = format!("{prefix}{}", if is_last { "    " } else { "│   " });
                    build_tree(grandchildren, &next_prefix, result, is_ignored, max_files);
                }
            }
        }
    }

    if let Some(children) = node.children.as_ref() {
        build_tree(children, "", &mut result, is_ignored.as_ref(), max_files);
    }

    result
}

fn filter_file_tree_by_selection(
    node: &FileNode,
    selected_paths: &HashSet<String>,
    root_path: &str,
) -> Option<FileNode> {
    let node_relative_path = if node.path.starts_with(root_path) {
        node.path[root_path.len()..]
            .trim_start_matches(['/', '\\'])
            .replace('\\', "/")
    } else {
        node.path.replace('\\', "/")
    };

    if selected_paths.contains(&node_relative_path) {
        return Some(FileNode {
            path: node.path.clone(),
            name: node.name.clone(),
            is_directory: node.is_directory,
            children: None,
        });
    }

    if node.is_directory {
        if let Some(children) = node.children.as_ref() {
            let new_children: Vec<FileNode> = children
                .iter()
                .filter_map(|child| filter_file_tree_by_selection(child, selected_paths, root_path))
                .collect();
            if !new_children.is_empty() {
                return Some(FileNode {
                    path: node.path.clone(),
                    name: node.name.clone(),
                    is_directory: true,
                    children: Some(new_children),
                });
            }
        }
    }

    None
}
