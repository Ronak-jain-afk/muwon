use std::path::{Path, PathBuf};

const AUDIO_EXTENSIONS: &[&str] = &["mp3", "m4a", "flac", "ogg", "opus", "wav", "wma", "aac"];

fn is_audio_file(path: &Path) -> bool {
    path.extension()
        .and_then(|e| e.to_str())
        .map(|e| AUDIO_EXTENSIONS.contains(&e.to_lowercase().as_str()))
        .unwrap_or(false)
}

pub struct Scanner;

impl Scanner {
    pub fn scan_directory(path: &Path) -> Vec<PathBuf> {
        let mut files = Vec::new();
        if !path.is_dir() {
            return files;
        }

        if let Ok(entries) = std::fs::read_dir(path) {
            for entry in entries.flatten() {
                let entry_path = entry.path();
                if entry_path.is_dir() {
                    files.extend(Self::scan_directory(&entry_path));
                } else if is_audio_file(&entry_path) {
                    files.push(entry_path);
                }
            }
        }
        files
    }
}
