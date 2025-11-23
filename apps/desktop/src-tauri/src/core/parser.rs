use anyhow::Result;
use nom::{
    branch::alt,
    bytes::complete::{tag, tag_no_case, take_until},
    character::complete::{line_ending, space1},
    combinator::rest,
    multi::many0,
    sequence::{preceded, terminated},
    IResult, Parser,
};
use std::collections::HashMap;

#[derive(Debug, PartialEq)]
pub enum IntermediateOperation {
    Patch {
        file_path: String,
        search_replace_blocks: Vec<(String, String)>,
        is_new_file: bool,
    },
    Overwrite {
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

fn parse_command_word(input: &str) -> IResult<&str, &str> {
    alt((
        tag_no_case("CREATE"),
        tag_no_case("OVERWRITE"),
        tag_no_case("PATCH"),
        tag_no_case("DELETE"),
        tag_no_case("MOVE"),
    ))
    .parse(input)
}

fn parse_command_line(input: &str) -> IResult<&str, (&str, &str)> {
    let (input, command) = parse_command_word(input)?;
    let (input, _) = space1(input)?;
    let (input, args) = rest(input)?;
    Ok((input, (command, args)))
}

fn parse_search_replace_block(i: &str) -> IResult<&str, (&str, &str)> {
    let (i, _) = terminated(tag("<<<<<<< SEARCH"), line_ending).parse(i)?;

    let (i, search) = take_until("=======")(i)?;
    let (i, _) = tag("=======")(i)?;
    let (i, _) = line_ending(i)?;

    let (i, replace) = take_until(">>>>>>> REPLACE")(i)?;
    let (i, _) = tag(">>>>>>> REPLACE")(i)?;

    let search = search.strip_suffix('\n').unwrap_or(search);
    let search = search.strip_suffix('\r').unwrap_or(search);

    let replace = replace.strip_suffix('\n').unwrap_or(replace);
    let replace = replace.strip_suffix('\r').unwrap_or(replace);

    Ok((i, (search, replace)))
}

fn parse_all_search_replace_blocks(content: &str) -> IResult<&str, Vec<(&str, &str)>> {
    many0(preceded(
        take_until("<<<<<<< SEARCH"),
        parse_search_replace_block,
    ))
    .parse(content)
}

fn sanitize_path(path: &str) -> String {
    path.trim()
        .trim_matches(|c| c == '`' || c == '\'' || c == '"')
        .to_string()
}

struct MarkdownParser<'a> {
    markdown: &'a str,
    operations: Vec<IntermediateOperation>,
}

impl<'a> MarkdownParser<'a> {
    fn new(markdown: &'a str) -> Self {
        Self {
            markdown,
            operations: Vec::new(),
        }
    }

    fn run(mut self) -> Result<Vec<IntermediateOperation>> {
        let command_blocks = self.parse_command_blocks();
        let mut operations_map = HashMap::new();

        for op in command_blocks {
            let key = match &op {
                IntermediateOperation::Patch { file_path, .. } => file_path.clone(),
                IntermediateOperation::Overwrite { file_path, .. } => file_path.clone(),
                IntermediateOperation::Delete { file_path } => file_path.clone(),
                IntermediateOperation::Move { from_path, .. } => from_path.clone(),
            };
            operations_map.entry(key).or_insert(op);
        }

        self.operations = self
            .markdown
            .lines()
            .filter_map(|line| {
                if let Ok((_, (command, args))) = parse_command_line(line) {
                    let args = args.trim();
                    let key = if command.to_uppercase() == "MOVE" {
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
            })
            .collect();

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
                        if let Some(op) =
                            self.process_command_block(&command, &args, &content_without_last_fence)
                        {
                            operations.push(op);
                        }
                    }
                    current_block_content.clear();
                }
            } else if is_fence {
                if last_command.is_some() {
                    fence_nesting += 1;
                }
            } else if let Ok((_, (command, args))) = parse_command_line(line) {
                let command = command.to_uppercase();
                let args = args.trim().to_string();

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

    fn process_command_block(
        &self,
        command: &str,
        args: &str,
        content: &str,
    ) -> Option<IntermediateOperation> {
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
            "CREATE" | "OVERWRITE" => Some(IntermediateOperation::Overwrite {
                file_path: sanitize_path(args),
                content: content.to_string(),
                is_new_file: command == "CREATE",
            }),
            "PATCH" => {
                let mut is_new_file = false;
                let mut search_replace_blocks = Vec::new();

                if let Ok((_, captures)) = parse_all_search_replace_blocks(content) {
                    if captures.is_empty() {
                        return None;
                    }
                    for (i, &(search_block, replace_block)) in captures.iter().enumerate() {
                        if i == 0 {
                            is_new_file = search_block.trim().is_empty();
                        }
                        search_replace_blocks
                            .push((search_block.to_string(), replace_block.to_string()));
                    }
                } else {
                    return None;
                }

                if !search_replace_blocks.is_empty() {
                    return Some(IntermediateOperation::Patch {
                        file_path: sanitize_path(args),
                        search_replace_blocks,
                        is_new_file,
                    });
                }
                None
            }
            _ => None,
        }
    }
}

pub(crate) fn parse(markdown: &str) -> Result<Vec<IntermediateOperation>> {
    MarkdownParser::new(markdown).run()
}
