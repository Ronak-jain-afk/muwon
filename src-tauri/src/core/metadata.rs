use std::path::Path;
use lofty::prelude::{Accessor, TaggedFileExt, AudioFile};
use lofty::probe::Probe;
use crate::models::Song;

/// Thumbnail candidates in priority order: same-name, cover, folder, albumart, front
const THUMB_CANDIDATES: &[&str] = &["cover", "folder", "albumart", "front"];

pub struct Metadata;

impl Metadata {
    pub fn extract(path: &Path, covers_dir: &Path) -> Song {
        let id = compute_id(path);
        let format = path
            .extension()
            .and_then(|e| e.to_str())
            .unwrap_or("")
            .to_lowercase();
        let dir = path.parent().unwrap_or(Path::new(""));
        let stem = path.file_stem().and_then(|s| s.to_str()).unwrap_or("");

        let mut title = stem.to_string();
        let mut artist = String::new();
        let mut album = String::new();
        let mut duration = 0.0f64;
        let mut track_number: Option<i32> = None;
        let mut thumbnail_path = String::new();
        let mut embedded_cover = false;

        if let Ok(tagged) = Probe::open(path).and_then(|p| p.read()) {
            duration = tagged.properties().duration().as_secs_f64();

            if let Some(tag) = tagged.primary_tag() {
                if let Some(t) = tag.title() { title = t.to_string(); }
                if let Some(a) = tag.artist() { artist = a.to_string(); }
                if let Some(a) = tag.album() { album = a.to_string(); }
                if let Some(t) = tag.track() { track_number = Some(t as i32).filter(|&t| t > 0); }
            } else if let Some(tag) = tagged.first_tag() {
                if let Some(t) = tag.title() { title = t.to_string(); }
                if let Some(a) = tag.artist() { artist = a.to_string(); }
                if let Some(a) = tag.album() { album = a.to_string(); }
                if let Some(t) = tag.track() { track_number = Some(t as i32).filter(|&t| t > 0); }
            }

            // Embedded cover extraction
            if let Some(tag) = tagged.primary_tag() {
                if let Some(picture) = tag.pictures().first() {
                    let data = picture.data();
                    if !data.is_empty() {
                        let cover_path = covers_dir.join(format!("{id}.jpg"));
                        if !cover_path.exists() {
                            let _ = std::fs::create_dir_all(covers_dir);
                            let _ = std::fs::write(&cover_path, data);
                        }
                        thumbnail_path = cover_path.to_string_lossy().to_string();
                        embedded_cover = true;
                    }
                }
            }
        }

        // Thumbnail fallback chain: same-name → cover/folder/albumart/front
        if thumbnail_path.is_empty() {
            thumbnail_path = Self::resolve_thumbnail(dir, stem, path);
        }

        Song {
            id,
            file_path: path.to_string_lossy().to_string(),
            title,
            artist,
            album,
            duration,
            track_number,
            thumbnail_path,
            lyrics_path: Self::resolve_lyrics(dir, stem),
            format,
            embedded_cover,
            available: true,
        }
    }

    fn resolve_thumbnail(dir: &Path, stem: &str, audio_path: &Path) -> String {
        let image_exts = ["jpg", "jpeg", "png", "webp"];

        for ext in &image_exts {
            let candidate = dir.join(format!("{stem}.{ext}"));
            if candidate.exists() && candidate != audio_path {
                return candidate.to_string_lossy().to_string();
            }
        }

        for name in THUMB_CANDIDATES {
            for ext in &image_exts {
                let candidate = dir.join(format!("{name}.{ext}"));
                if candidate.exists() {
                    return candidate.to_string_lossy().to_string();
                }
            }
        }

        String::new()
    }

    fn resolve_lyrics(dir: &Path, stem: &str) -> String {
        for ext in &["lrc", "txt"] {
            let candidate = dir.join(format!("{stem}.{ext}"));
            if candidate.exists() {
                return candidate.to_string_lossy().to_string();
            }
        }

        for ext in &["lrc", "txt"] {
            let candidate = dir.join(format!("lyrics.{ext}"));
            if candidate.exists() {
                return candidate.to_string_lossy().to_string();
            }
        }

        String::new()
    }
}

fn compute_id(path: &Path) -> String {
    let canonical = path.canonicalize().unwrap_or_else(|_| path.to_path_buf());
    blake3::hash(canonical.to_string_lossy().as_bytes()).to_hex()[..16].to_string()
}
