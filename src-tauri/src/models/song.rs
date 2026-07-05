use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Song {
    pub id: String,
    pub file_path: String,
    pub title: String,
    pub artist: String,
    pub album: String,
    pub duration: f64,
    pub track_number: Option<i32>,
    pub thumbnail_path: String,
    pub lyrics_path: String,
    pub format: String,
    pub embedded_cover: bool,
    pub available: bool,
}
