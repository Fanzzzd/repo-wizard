use anyhow::Result;
use lazy_static::lazy_static;
use regex::Regex;
use serde::{Deserialize, Serialize};
use similar;

#[derive(Debug, Serialize, Deserialize, PartialEq)]
#[serde(tag = "type", rename_all = "lowercase")]
pub enum ChangeOperation {
    Modify {
        #[serde(rename = "filePath")]
        file_path: String,
        diff: String,
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
    operations: Vec<ChangeOperation>,
}

impl<'a> Parser<'a> {
    fn new(markdown: &'a str) -> Self {
        Self {
            markdown,
            operations: Vec::new(),
        }
    }

    fn run(mut self) -> Result<Vec<ChangeOperation>> {
        self.parse_udiff_blocks();
        self.parse_command_blocks();

        Ok(self.operations)
    }

    fn parse_command_blocks(&mut self) {
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
                        self.process_command_block(&command, &args, &content_without_last_fence);
                    }
                    current_block_content.clear();
                }
            } else {
                if is_fence {
                    if last_command.is_some() {
                        fence_nesting += 1;
                    }
                } else if let Some(caps) = COMMAND_RE.captures(line) {
                    let command = caps.get(1).unwrap().as_str().to_uppercase();
                    let args = caps.get(2).unwrap().as_str().trim().to_string();

                    if command == "DELETE" || command == "MOVE" {
                        self.process_command_block(&command, &args, "");
                    } else {
                        last_command = Some((command, args));
                    }
                }
            }
        }
    }

    fn process_command_block(&mut self, command: &str, args: &str, content: &str) {
        match command {
            "DELETE" => self.operations.push(ChangeOperation::Delete {
                file_path: sanitize_path(args),
            }),
            "MOVE" => {
                let rest_lower = args.to_lowercase();
                if let Some(to_index) = rest_lower.rfind(" to ") {
                    let from_path = sanitize_path(&args[..to_index]);
                    let to_path = sanitize_path(&args[to_index + 4..]);
                    if !from_path.is_empty() && !to_path.is_empty() {
                        self.operations
                            .push(ChangeOperation::Move { from_path, to_path });
                    }
                }
            }
            "CREATE" | "REWRITE" => {
                self.operations.push(ChangeOperation::Rewrite {
                    file_path: sanitize_path(args),
                    content: content.to_string(),
                    is_new_file: command == "CREATE",
                });
            }
            "MODIFY" => {
                for cap in SEARCH_REPLACE_RE.captures_iter(content) {
                    let search_block = cap.get(1).unwrap().as_str();
                    let replace_block = cap.get(2).unwrap().as_str();
                    let is_new_file = search_block.trim().is_empty();

                    let from_header = if is_new_file { "/dev/null" } else { args };
                    let diff = similar::TextDiff::from_lines(search_block, replace_block)
                        .unified_diff()
                        .context_radius(usize::MAX)
                        .header(from_header, args)
                        .to_string();

                    self.operations.push(ChangeOperation::Modify {
                        file_path: sanitize_path(args),
                        diff,
                        is_new_file,
                    });
                }
            }
            _ => {}
        }
    }

    fn parse_udiff_blocks(&mut self) {
        let re = Regex::new(r"```udiff\s*([\s\S]*?)```").unwrap();
        for cap in re.captures_iter(self.markdown) {
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
                    self.operations.push(ChangeOperation::Modify {
                        file_path: to_path_str.to_string(),
                        diff: content.to_string(),
                        is_new_file,
                    });
                }
            }
        }
    }
}

pub fn parse_changes_from_markdown(markdown: &str) -> Result<Vec<ChangeOperation>> {
    Parser::new(markdown).run()
}