use anyhow::{anyhow, Result};
use lazy_static::lazy_static;
use regex::Regex;
use serde::{Deserialize, Serialize};

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
    static ref COMMAND_RE: Regex = Regex::new(r"^(?i)(CREATE|REWRITE|MODIFY|DELETE|MOVE)\s+(.*)").unwrap();
    static ref SEARCH_REPLACE_RE: Regex = Regex::new(r"(?s)<<<<<<< SEARCH\r?\n(.*?)\r?\n=======\r?\n(.*?)\r?\n>>>>>>> REPLACE").unwrap();
    static ref UDIFF_HEADER_RE: Regex = Regex::new(r"(?m)^--- (?:a/(.+?)|(/dev/null)|(.+?))\r?\n\+\+\+ (?:b/)?(.+?)\r?\n").unwrap();
}

fn sanitize_path(path: &str) -> String {
    path.trim().trim_matches(|c| c == '`' || c == '\'' || c == '"').to_string()
}

struct Parser<'a> {
    lines: Vec<&'a str>,
    cursor: usize,
    operations: Vec<ChangeOperation>,
}

impl<'a> Parser<'a> {
    fn new(markdown: &'a str) -> Self {
        Self {
            lines: markdown.lines().collect(),
            cursor: 0,
            operations: Vec::new(),
        }
    }

    fn run(mut self) -> Result<Vec<ChangeOperation>> {
        while self.cursor < self.lines.len() {
            if !self.parse_next()? {
                self.cursor += 1;
            }
        }
        Ok(self.operations)
    }

    fn parse_next(&mut self) -> Result<bool> {
        let line = self.lines.get(self.cursor).unwrap_or(&"").trim();

        if line.starts_with("```udiff") {
            self.parse_udiff_block()?;
            return Ok(true);
        }

        if let Some(caps) = COMMAND_RE.captures(line) {
            let command = caps.get(1).unwrap().as_str().to_uppercase();
            let rest = caps.get(2).unwrap().as_str().trim().to_string();
            self.cursor += 1;
            self.parse_command(&command, &rest)?;
            return Ok(true);
        }

        Ok(false)
    }

    fn parse_command(&mut self, command: &str, rest: &str) -> Result<()> {
        match command {
            "DELETE" => self.operations.push(ChangeOperation::Delete {
                file_path: sanitize_path(rest),
            }),
            "MOVE" => {
                let rest_lower = rest.to_lowercase();
                if let Some(to_index) = rest_lower.rfind(" to ") {
                    let from_path = sanitize_path(&rest[..to_index]);
                    let to_path = sanitize_path(&rest[to_index + 4..]);
                    if !from_path.is_empty() && !to_path.is_empty() {
                        self.operations.push(ChangeOperation::Move { from_path, to_path });
                    }
                }
            }
            "CREATE" | "REWRITE" | "MODIFY" => {
                let file_path = sanitize_path(rest);
                let (content, next_cursor) = self.find_fenced_block(self.cursor)?;
                self.cursor = next_cursor;

                if command == "MODIFY" {
                    self.parse_search_replace_blocks(&file_path, &content)?;
                } else {
                    self.operations.push(ChangeOperation::Rewrite {
                        file_path,
                        content,
                        is_new_file: command == "CREATE",
                    });
                }
            }
            _ => {}
        }
        Ok(())
    }

    fn parse_udiff_block(&mut self) -> Result<()> {
        let (content, next_cursor) = self.find_fenced_block(self.cursor)?;
        self.cursor = next_cursor;
    
        if let Some(caps) = UDIFF_HEADER_RE.captures(&content) {
            let from_path_with_a = caps.get(1).map(|m| m.as_str());
            let is_null_path = caps.get(2).is_some();
            let from_path_plain = caps.get(3).map(|m| m.as_str());
            let to_path_str = caps.get(4).map(|m| m.as_str().trim()).unwrap_or("");
            
            let from_path_str = from_path_with_a.or(from_path_plain).map(|s| s.trim()).unwrap_or("/dev/null");
            let is_new_file = is_null_path || from_path_str == "/dev/null";

            if !to_path_str.is_empty() {
                let header = caps.get(0).unwrap().as_str();
                let diff_body = &content[header.len()..];
                
                let from_header = if is_new_file {
                    "/dev/null".to_string()
                } else {
                    format!("a/{}", from_path_str)
                };

                let diff = format!(
                    "--- {}\n+++ b/{}\n{}",
                    from_header,
                    to_path_str,
                    diff_body
                );

                self.operations.push(ChangeOperation::Modify {
                    file_path: to_path_str.to_string(),
                    diff,
                    is_new_file,
                });
            }
        }
        Ok(())
    }
    
    fn parse_search_replace_blocks(&mut self, file_path: &str, content: &str) -> Result<()> {
        for cap in SEARCH_REPLACE_RE.captures_iter(content) {
            let search_block = cap.get(1).unwrap().as_str();
            let replace_block = cap.get(2).unwrap().as_str();
            let is_new_file = search_block.trim().is_empty();

            let from_header = if is_new_file { "/dev/null" } else { file_path };
            let diff = similar::TextDiff::from_lines(search_block, replace_block)
                .unified_diff()
                .context_radius(0)
                .header(from_header, file_path)
                .to_string();

            self.operations.push(ChangeOperation::Modify {
                file_path: file_path.to_string(),
                diff,
                is_new_file,
            });
        }
        Ok(())
    }

    fn find_fenced_block(&self, start_index: usize) -> Result<(String, usize)> {
        let mut block_start = None;
        // 1. Find the start of the first code block, skipping any text lines before it.
        for i in start_index..self.lines.len() {
            if self.lines[i].trim().starts_with("```") {
                block_start = Some(i);
                break;
            }
        }
    
        let start_line = block_start.ok_or_else(|| anyhow!("Could not find start of a fenced code block after line {}", start_index))?;
    
        // 2. Find the end of the block by looking for a closing fence.
        for i in (start_line + 1)..self.lines.len() {
            if self.lines[i].trim() == "```" {
                let content = self.lines[start_line + 1..i].join("\n");
                return Ok((content, i + 1));
            }
        }
    
        Err(anyhow!("Could not find end of the fenced code block that started on line {}", start_line + 1))
    }
}

pub fn parse_changes_from_markdown(markdown: &str) -> Result<Vec<ChangeOperation>> {
    Parser::new(markdown).run()
}