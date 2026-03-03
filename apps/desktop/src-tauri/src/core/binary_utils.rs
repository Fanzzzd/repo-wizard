use content_inspector::{inspect, ContentType};

pub fn is_binary_bytes(bytes: &[u8]) -> bool {
    matches!(inspect(bytes), ContentType::BINARY)
}
