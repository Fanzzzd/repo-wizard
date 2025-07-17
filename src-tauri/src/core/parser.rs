use anyhow::Result;
use lazy_static::lazy_static;
use regex::Regex;
use serde::{Deserialize, Serialize};
use similar;
use std::collections::HashMap;

#[derive(Debug, Serialize, Deserialize, PartialEq)]
#[serde(tag = "type", rename_all = "lowercase")]
pub enum ChangeOperation {
    Modify {
        #[serde(rename = "filePath")]
        file_path: String,
        content: String,
        #[serde(rename = "isNewFile")]
        is_new_file: bool,
    },
    Rewrite {
        #[serde(rename = "filePath")]
        file_path: String,
        content: String,
        #[serde(rename = "isNewFile")]
        is_new_file: bool,
    },
    Delete {
        #[serde(rename = "filePath")]
        file_path: String,
    },
    Move {
        #[serde(rename = "fromPath")]
        from_path: String,
        #[serde(rename = "toPath")]
        to_path: String,
    },
}

#[derive(Debug, PartialEq)]
pub enum IntermediateOperation {
    Modify {
        file_path: String,
        diff: String,
        is_new_file: bool,
    },
    Rewrite {
        file_path: String,
        content: String,
        is_new_file: bool,
    },
    Delete {
        file_path: String,
    },
    Move {
        from_path: String,
        to_path: String,
    },
}

lazy_static! {
    static ref COMMAND_RE: Regex =
        Regex::new(r"^(?i)(CREATE|REWRITE|MODIFY|DELETE|MOVE)\s+(.*)").unwrap();
    static ref SEARCH_REPLACE_RE: Regex =
        Regex::new(r"(?s)<<<<<<< SEARCH\r?\n(.*?)\r?\n=======\r?\n(.*?)\r?\n>>>>>>> REPLACE")
            .unwrap();
    static ref UDIFF_HEADER_RE: Regex =
        Regex::new(r"(?m)^--- (?:a/(.+?)|(/dev/null)|(.+?))\r?\n\+\+\+ (?:b/)?(.+?)\r?\n").unwrap();
}

fn sanitize_path(path: &str) -> String {
    path.trim()
        .trim_matches(|c| c == '`' || c == '\'' || c == '"')
        .to_string()
}

struct Parser<'a> {
    markdown: &'a str,
    operations: Vec<IntermediateOperation>,
}

impl<'a> Parser<'a> {
    fn new(markdown: &'a str) -> Self {
        Self {
            markdown,
            operations: Vec::new(),
        }
    }

    fn run(mut self) -> Result<Vec<IntermediateOperation>> {
        let mut udiff_blocks = self.parse_udiff_blocks();
        let mut command_blocks = self.parse_command_blocks();

        let mut operations_map = HashMap::new();

        for op in udiff_blocks.drain(..) {
            let key = match &op {
                IntermediateOperation::Modify { file_path, .. } => file_path.clone(),
                IntermediateOperation::Rewrite { file_path, .. } => file_path.clone(),
                IntermediateOperation::Delete { file_path } => file_path.clone(),
                IntermediateOperation::Move { from_path, .. } => from_path.clone(),
            };
            operations_map.entry(key).or_insert(op);
        }

        for op in command_blocks.drain(..) {
             let key = match &op {
                IntermediateOperation::Modify { file_path, .. } => file_path.clone(),
                IntermediateOperation::Rewrite { file_path, .. } => file_path.clone(),
                IntermediateOperation::Delete { file_path } => file_path.clone(),
                IntermediateOperation::Move { from_path, .. } => from_path.clone(),
            };
            operations_map.entry(key).or_insert(op);
        }

        self.operations = self.markdown.lines()
            .filter_map(|line| {
                if let Some(caps) = COMMAND_RE.captures(line) {
                    let args = caps.get(2).unwrap().as_str().trim();
                    let key = if caps.get(1).unwrap().as_str().to_uppercase() == "MOVE" {
                        if let Some(to_index) = args.to_lowercase().rfind(" to ") {
                             sanitize_path(&args[..to_index])
                        } else {
                            sanitize_path(args)
                        }
                    } else {
                        sanitize_path(args)
                    };
                    return operations_map.remove(&key);
                }
                None
            }).collect();


        for cap in Regex::new(r"```udiff\s*([\s\S]*?)```").unwrap().captures_iter(self.markdown) {
             let content = cap.get(1).unwrap().as_str().trim();
             if let Some(caps) = UDIFF_HEADER_RE.captures(content) {
                let to_path_str = caps.get(4).map(|m| m.as_str().trim()).unwrap_or("");
                 if !to_path_str.is_empty() {
                     if let Some(op) = operations_map.remove(to_path_str) {
                         self.operations.push(op);
                     }
                 }
             }
        }


        Ok(self.operations)
    }

    fn parse_command_blocks(&self) -> Vec<IntermediateOperation> {
        let mut operations = Vec::new();
        let mut last_command: Option<(String, String)> = None;
        let mut current_block_content = String::new();
        let mut fence_nesting = 0;

        for line in self.markdown.lines() {
            let trimmed_line = line.trim();
            let is_fence = trimmed_line.starts_with("```");

            if fence_nesting > 0 {
                current_block_content.push_str(line);
                current_block_content.push('\n');
                if is_fence {
                    let lang = trimmed_line.strip_prefix("```").unwrap_or("").trim();
                    if lang.is_empty() {
                        fence_nesting -= 1;
                    } else {
                        fence_nesting += 1;
                    }
                }

                if fence_nesting == 0 {
                    if let Some((command, args)) = last_command.take() {
                        let content_without_last_fence = current_block_content
                            .lines()
                            .take(current_block_content.lines().count() - 1)
                            .collect::<Vec<_>>()
                            .join("\n");
                        if let Some(op) = self.process_command_block(&command, &args, &content_without_last_fence) {
                            operations.push(op);
                        }
                    }
                    current_block_content.clear();
                }
            } else if is_fence {
                if last_command.is_some() {
                    fence_nesting += 1;
                }
            } else if let Some(caps) = COMMAND_RE.captures(line) {
                let command = caps.get(1).unwrap().as_str().to_uppercase();
                let args = caps.get(2).unwrap().as_str().trim().to_string();

                if command == "DELETE" || command == "MOVE" {
                     if let Some(op) = self.process_command_block(&command, &args, "") {
                        operations.push(op);
                    }
                } else {
                    last_command = Some((command, args));
                }
            }
        }
        operations
    }

    fn process_command_block(&self, command: &str, args: &str, content: &str) -> Option<IntermediateOperation> {
        match command {
            "DELETE" => Some(IntermediateOperation::Delete {
                file_path: sanitize_path(args),
            }),
            "MOVE" => {
                let rest_lower = args.to_lowercase();
                if let Some(to_index) = rest_lower.rfind(" to ") {
                    let from_path = sanitize_path(&args[..to_index]);
                    let to_path = sanitize_path(&args[to_index + 4..]);
                    if !from_path.is_empty() && !to_path.is_empty() {
                        return Some(IntermediateOperation::Move { from_path, to_path });
                    }
                }
                None
            }
            "CREATE" | "REWRITE" => Some(IntermediateOperation::Rewrite {
                file_path: sanitize_path(args),
                content: content.to_string(),
                is_new_file: command == "CREATE",
            }),
            "MODIFY" => {
                let mut is_new_file = false;
                let mut diffs = String::new();

                for (i, cap) in SEARCH_REPLACE_RE.captures_iter(content).enumerate() {
                    let search_block = cap.get(1).unwrap().as_str();
                    let replace_block = cap.get(2).unwrap().as_str();
                    
                    if i == 0 {
                        is_new_file = search_block.trim().is_empty();
                    }

                    let from_header = if i == 0 && is_new_file { "/dev/null" } else { args };
                    let diff = similar::TextDiff::from_lines(search_block, replace_block)
                        .unified_diff()
                        .context_radius(usize::MAX)
                        .header(from_header, args)
                        .to_string();
                    
                    diffs.push_str(&diff);
                }

                if !diffs.is_empty() {
                    return Some(IntermediateOperation::Modify {
                        file_path: sanitize_path(args),
                        diff: diffs,
                        is_new_file,
                    });
                }
                None
            }
            _ => None,
        }
    }

    fn parse_udiff_blocks(&self) -> Vec<IntermediateOperation> {
        let re = Regex::new(r"```udiff\s*([\s\S]*?)```").unwrap();
        re.captures_iter(self.markdown).filter_map(|cap| {
            let content = cap.get(1).unwrap().as_str().trim();
            if let Some(caps) = UDIFF_HEADER_RE.captures(content) {
                let from_path_with_a = caps.get(1).map(|m| m.as_str());
                let is_null_path = caps.get(2).is_some();
                let from_path_plain = caps.get(3).map(|m| m.as_str());
                let to_path_str = caps.get(4).map(|m| m.as_str().trim()).unwrap_or("");

                let from_path_str = from_path_with_a
                    .or(from_path_plain)
                    .map(|s| s.trim())
                    .unwrap_or("/dev/null");
                let is_new_file = is_null_path || from_path_str == "/dev/null";

                if !to_path_str.is_empty() {
                    return Some(IntermediateOperation::Modify {
                        file_path: to_path_str.to_string(),
                        diff: content.to_string(),
                        is_new_file,
                    });
                }
            }
            None
        }).collect()
    }
}

pub(crate) fn parse(markdown: &str) -> Result<Vec<IntermediateOperation>> {
    Parser::new(markdown).run()
}