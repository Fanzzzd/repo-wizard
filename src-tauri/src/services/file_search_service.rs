use crate::types::{IgnoreSettings, SearchResult};
use anyhow::Result;
use crossbeam_channel::unbounded;
use std::path::Path;
use std::sync::{Arc, RwLock};
use xvc_walker::{walk_parallel, IgnoreRules, PathMetadata, SharedIgnoreRules, WalkOptions};


fn normalize_path_str(p: &Path) -> String {
    p.to_string_lossy().replace('\\', "/")
}

fn calculate_fuzzy_score(query: &str, text: &str) -> i32 {
    if query.is_empty() {
        return 0;
    }
    
    let query_lower = query.to_lowercase();
    let text_lower = text.to_lowercase();
    
    // Exact match gets highest score
    if query_lower == text_lower {
        return 10000;
    }
    
    // Prefix match gets very high score
    if text_lower.starts_with(&query_lower) {
        return 5000 + (1000 - text.len() as i32);
    }
    
    // Contains match gets good score
    if text_lower.contains(&query_lower) {
        let pos = text_lower.find(&query_lower).unwrap_or(text.len()) as i32;
        return 3000 - pos + (1000 - text.len() as i32);
    }
    
    // Fuzzy character-by-character matching
    let query_chars: Vec<char> = query_lower.chars().collect();
    let text_chars: Vec<char> = text_lower.chars().collect();
    
    if query_chars.len() > text_chars.len() {
        return -100;
    }
    
    let mut query_idx = 0;
    let mut text_idx = 0;
    let mut score = 0;
    let mut consecutive_matches = 0;
    let mut first_match_idx = None;
    let mut matched_chars = 0;
    
    while query_idx < query_chars.len() && text_idx < text_chars.len() {
        if query_chars[query_idx] == text_chars[text_idx] {
            if first_match_idx.is_none() {
                first_match_idx = Some(text_idx);
            }
            
            query_idx += 1;
            matched_chars += 1;
            consecutive_matches += 1;
            
            // Bonus for consecutive matches
            score += consecutive_matches * 3;
            
            // Bonus for matches at word boundaries
            if text_idx == 0 || 
               text_chars[text_idx - 1] == '/' || 
               text_chars[text_idx - 1] == '_' || 
               text_chars[text_idx - 1] == '-' || 
               text_chars[text_idx - 1] == '.' {
                score += 15;
            }
        } else {
            consecutive_matches = 0;
        }
        text_idx += 1;
    }
    
    // Calculate match ratio
    let match_ratio = matched_chars as f32 / query_chars.len() as f32;
    
    // If we didn't match all characters, give partial credit
    if query_idx < query_chars.len() {
        if match_ratio >= 0.7 {  // At least 70% of characters matched
            score = (score as f32 * match_ratio) as i32;
        } else {
            return -50; // Poor match
        }
    }
    
    // Penalty for late first match
    if let Some(first_idx) = first_match_idx {
        score -= (first_idx as f32 * 0.5) as i32;
    }
    
    // Bonus for shorter strings (more precise matches)
    score += 500 - (text_chars.len() as i32 / 2);
    
    // Ensure we have some minimum score for partial matches
    if score < -10 && match_ratio >= 0.5 {
        score = -5;  // Give partial matches a chance
    }
    
    score
}

pub async fn search_files(
    root_path: &Path,
    query: &str,
    settings: IgnoreSettings,
    limit: Option<usize>,
) -> Result<Vec<SearchResult>> {
    if query.trim().is_empty() {
        return Ok(vec![]);
    }
    
    let root_path_owned = root_path.to_owned();
    let query_owned = query.to_string();
    let limit = limit.unwrap_or(100);
    
    let results = tokio::task::spawn_blocking(move || {
        let root_path = &root_path_owned;
        let query = &query_owned;
        
        let ignore_filename = if settings.respect_gitignore {
            Some(".gitignore".to_string())
        } else {
            None
        };
        
        // Initialize with global patterns
        let ignore_rules = IgnoreRules::from_global_patterns(
            root_path,
            ignore_filename.as_deref(),
            &settings.custom_ignore_patterns,
        );
        let shared_ignore_rules: SharedIgnoreRules = Arc::new(RwLock::new(ignore_rules));
        
        let walk_options = WalkOptions {
            ignore_filename,
            include_dirs: true, // Allow walker to enter directories; directories are included in the search results and scored like files
        };
        
        let (path_sender, path_receiver) = unbounded();
        
        // Clone path for the thread
        let root_path_for_thread = root_path.to_owned();
        
        // Start the walker in a separate thread
        let walk_handle = std::thread::spawn(move || {
            let _ = walk_parallel(shared_ignore_rules, &root_path_for_thread, walk_options, path_sender);
        });
        
        let mut scored_results: Vec<SearchResult> = Vec::new();
        
        // Process paths as they come in
        while let Ok(path_result) = path_receiver.recv() {
            let path_metadata = match path_result {
                Ok(metadata) => metadata,
                Err(_) => continue, // Skip errors
            };
            let PathMetadata { path, .. } = path_metadata;
            
            let is_directory = path.is_dir();
            
            let file_name = path.file_name()
                .and_then(|n| n.to_str())
                .unwrap_or("")
                .to_string();
            
            let relative_path = path.strip_prefix(root_path)
                .map(normalize_path_str)
                .unwrap_or_else(|_| normalize_path_str(&path));
            
            // Calculate fuzzy score for filename (highest priority)
            let filename_score = calculate_fuzzy_score(query, &file_name);
            
            // Calculate fuzzy score for full relative path
            let path_score = calculate_fuzzy_score(query, &relative_path);
            
            // Also try matching against just the path segments
            let path_segments: Vec<&str> = relative_path.split('/').collect();
            let segment_score = path_segments.iter()
                .map(|segment| calculate_fuzzy_score(query, segment))
                .max()
                .unwrap_or(-1);
            
            // Try matching against the file extension (only for files)
            let extension_score = if !is_directory {
                if let Some(ext) = path.extension().and_then(|e| e.to_str()) {
                    calculate_fuzzy_score(query, ext)
                } else {
                    -1
                }
            } else {
                -1
            };
            
            // Prioritize filename matches by giving them a bonus
            let adjusted_filename_score = if filename_score > 0 { 
                if is_directory {
                    // Give directories a smaller bonus to prioritize files slightly
                    filename_score + 800
                } else {
                    filename_score + 1000
                }
            } else { 
                filename_score 
            };
            
            // Use the best score from all attempts
            let final_score = [adjusted_filename_score, path_score, segment_score, extension_score]
                .iter()
                .max()
                .cloned()
                .unwrap_or(-1);
            
            // Be more lenient with scoring - include more potential matches
            if final_score >= -10 {  // Allow some negative scores for broader matches
                let parent_dir = path.parent()
                    .and_then(|p| p.strip_prefix(root_path).ok())
                    .map(normalize_path_str)
                    .unwrap_or_else(|| String::from(""));
                
                let search_result = SearchResult {
                    path: normalize_path_str(&path),
                    relative_path,
                    name: file_name,
                    parent_dir,
                    score: final_score,
                    is_directory,
                };
                
                scored_results.push(search_result);
            }
        }
        
        // Wait for walker to complete
        let _ = walk_handle.join();
        
        // Sort by score (highest first) and limit results
        scored_results.sort_by(|a, b| b.score.cmp(&a.score));
        scored_results.truncate(limit);
        
        
        scored_results
    }).await?;
    
    Ok(results)
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_fuzzy_scoring() {
        // Exact match should score highest
        assert!(calculate_fuzzy_score("test", "test") > calculate_fuzzy_score("test", "testing"));
        
        // Prefix match should score higher than substring
        assert!(calculate_fuzzy_score("te", "test") > calculate_fuzzy_score("te", "item"));
        
        // Should match all characters
        assert_eq!(calculate_fuzzy_score("xyz", "abc"), -50);
        
        // Empty query should return 0
        assert_eq!(calculate_fuzzy_score("", "anything"), 0);
    }
}