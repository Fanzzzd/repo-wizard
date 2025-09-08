use std::collections::HashMap;
use std::sync::Mutex;

#[derive(Default)]
pub struct WindowRegistry(pub Mutex<HashMap<String, Option<String>>>);

impl WindowRegistry {
    pub fn set_project_for_label(&self, label: &str, project_root: Option<&str>) {
        if let Ok(mut map) = self.0.lock() {
            map.insert(
                label.to_string(),
                project_root.map(|s| s.to_string()),
            );
        }
    }

    pub fn get_label_for_project(&self, project_root: &str) -> Option<String> {
        if let Ok(map) = self.0.lock() {
            for (label, root) in map.iter() {
                if root.as_deref() == Some(project_root) {
                    return Some(label.clone());
                }
            }
        }
        None
    }

    pub fn first_blank_window_label(&self) -> Option<String> {
        if let Ok(map) = self.0.lock() {
            for (label, project) in map.iter() {
                if project.is_none() {
                    return Some(label.clone());
                }
            }
        }
        None
    }
}