use crate::core::binary_utils;
use crate::types::FileTokenInfo;
use lru::LruCache;
use once_cell::sync::Lazy;
use sha2::{Digest, Sha256};
use std::fs;
use std::num::NonZeroUsize;
use std::path::Path;
use std::sync::{Arc, Mutex};
use std::time::Instant;
use std::time::{SystemTime, UNIX_EPOCH};
use tiktoken_rs::o200k_base_singleton;
use tokio::sync::Semaphore;
use tokio::task::JoinSet;

#[derive(Clone, Debug, Hash, PartialEq, Eq)]
struct CacheKey {
    path: String,
    mtime_ms: i64,
    size: u64,
}

static TOKEN_CACHE: Lazy<Mutex<LruCache<CacheKey, u32>>> = Lazy::new(|| {
    let capacity = NonZeroUsize::new(1024).unwrap();
    Mutex::new(LruCache::new(capacity))
});

static TOKEN_HASH_CACHE: Lazy<Mutex<LruCache<[u8; 32], u32>>> = Lazy::new(|| {
    let capacity = NonZeroUsize::new(4096).unwrap();
    Mutex::new(LruCache::new(capacity))
});

pub fn count_tokens(text: &str) -> usize {
    if text.is_empty() {
        return 0;
    }

    // Use o200k_base for GPT-5 family models.
    let bpe = o200k_base_singleton();
    bpe.encode_with_special_tokens(text).len()
}

pub fn count_file_tokens(path: &Path) -> FileTokenInfo {
    let start_time = Instant::now();
    let path_string = path.to_string_lossy().to_string();
    let metadata = match fs::metadata(path) {
        Ok(meta) => meta,
        Err(_) => {
            return FileTokenInfo {
                path: path_string,
                exists: false,
                is_binary: false,
                tokens: 0,
            };
        }
    };

    let cache_key = metadata
        .modified()
        .ok()
        .and_then(to_millis)
        .map(|mtime_ms| CacheKey {
            path: path_string.clone(),
            mtime_ms,
            size: metadata.len(),
        });

    if let Some(key) = cache_key.as_ref() {
        if let Some(tokens) = TOKEN_CACHE.lock().unwrap().get(key).copied() {
            if log::log_enabled!(log::Level::Debug) {
                log::debug!(
                    "token-count cache hit path={} total_ms={}",
                    path_string,
                    start_time.elapsed().as_millis()
                );
            }
            return FileTokenInfo {
                path: path_string,
                exists: true,
                is_binary: false,
                tokens,
            };
        }
    }

    let read_start = Instant::now();
    let bytes = match fs::read(path) {
        Ok(data) => data,
        Err(_) => {
            return FileTokenInfo {
                path: path_string,
                exists: false,
                is_binary: false,
                tokens: 0,
            };
        }
    };
    let read_ms = read_start.elapsed().as_millis();

    let is_binary = binary_utils::is_binary_bytes(&bytes);
    if is_binary {
        if log::log_enabled!(log::Level::Debug) {
            log::debug!(
                "token-count binary path={} bytes={} read_ms={} total_ms={}",
                path_string,
                bytes.len(),
                read_ms,
                start_time.elapsed().as_millis()
            );
        }
        return FileTokenInfo {
            path: path_string,
            exists: true,
            is_binary: true,
            tokens: 0,
        };
    }

    let hash_start = Instant::now();
    let hash: [u8; 32] = Sha256::digest(&bytes).into();
    let hash_ms = hash_start.elapsed().as_millis();

    if let Some(tokens) = TOKEN_HASH_CACHE.lock().unwrap().get(&hash).copied() {
        if let Some(key) = cache_key {
            TOKEN_CACHE.lock().unwrap().put(key, tokens);
        }
        if log::log_enabled!(log::Level::Debug) {
            log::debug!(
                "token-count hash hit path={} bytes={} read_ms={} hash_ms={} total_ms={}",
                path_string,
                bytes.len(),
                read_ms,
                hash_ms,
                start_time.elapsed().as_millis()
            );
        }
        return FileTokenInfo {
            path: path_string,
            exists: true,
            is_binary: false,
            tokens,
        };
    }

    let tokenize_start = Instant::now();
    let text = String::from_utf8_lossy(&bytes);
    let tokens = count_tokens(text.as_ref()) as u32;
    let tokenize_ms = tokenize_start.elapsed().as_millis();

    TOKEN_HASH_CACHE.lock().unwrap().put(hash, tokens);
    if let Some(key) = cache_key {
        TOKEN_CACHE.lock().unwrap().put(key, tokens);
    }

    if log::log_enabled!(log::Level::Debug) {
        log::debug!(
            "token-count computed path={} bytes={} read_ms={} hash_ms={} tokenize_ms={} total_ms={}",
            path_string,
            bytes.len(),
            read_ms,
            hash_ms,
            tokenize_ms,
            start_time.elapsed().as_millis()
        );
    }

    FileTokenInfo {
        path: path_string,
        exists: true,
        is_binary: false,
        tokens,
    }
}

pub async fn count_tokens_for_paths(paths: Vec<String>) -> anyhow::Result<Vec<FileTokenInfo>> {
    if paths.is_empty() {
        return Ok(Vec::new());
    }

    let paths_len = paths.len();
    let max_parallel = std::thread::available_parallelism()
        .map(|count| count.get())
        .unwrap_or(4)
        .clamp(1, 6);
    let semaphore = Arc::new(Semaphore::new(max_parallel));
    let mut join_set = JoinSet::new();

    for path in paths {
        let semaphore = semaphore.clone();
        join_set.spawn(async move {
            let _permit = semaphore
                .acquire_owned()
                .await
                .map_err(anyhow::Error::from)?;
            let path_buf = std::path::PathBuf::from(path);
            tokio::task::spawn_blocking(move || count_file_tokens(&path_buf))
                .await
                .map_err(anyhow::Error::from)
        });
    }

    let mut results = Vec::with_capacity(paths_len);
    while let Some(result) = join_set.join_next().await {
        let file_result = result.map_err(anyhow::Error::from)?;
        results.push(file_result?);
    }
    Ok(results)
}

fn to_millis(time: SystemTime) -> Option<i64> {
    time.duration_since(UNIX_EPOCH)
        .ok()
        .map(|duration| duration.as_millis() as i64)
}
