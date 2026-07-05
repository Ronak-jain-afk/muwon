use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum PlaybackStatus {
    Playing,
    Paused,
    Stopped,
}

#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum RepeatMode {
    Off,
    One,
    All,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppState {
    pub current_song_id: Option<String>,
    pub playback_status: PlaybackStatus,
    pub position: f64,
    pub volume: f64,
    pub muted: bool,
    pub shuffle_enabled: bool,
    pub repeat_mode: RepeatMode,
    pub active_playlist_id: Option<String>,
}

impl Default for AppState {
    fn default() -> Self {
        Self {
            current_song_id: None,
            playback_status: PlaybackStatus::Stopped,
            position: 0.0,
            volume: 0.8,
            muted: false,
            shuffle_enabled: false,
            repeat_mode: RepeatMode::Off,
            active_playlist_id: None,
        }
    }
}
