use tauri::State;
use crate::core::{PlaybackEngine, PlaybackCommand};
use crate::commands::library::AppState;
use crate::models::PlaybackStatus;

pub struct PlaybackState {
    pub engine: PlaybackEngine,
}

#[tauri::command]
pub fn load_and_play(song_id: String, lib: State<'_, AppState>, pb: State<'_, PlaybackState>) -> Result<(), String> {
    let song = lib.0.get_song(&song_id)?.ok_or("Song not found")?;
    pb.engine.send(PlaybackCommand::Load(song.file_path.clone()))?;
    pb.engine.send(PlaybackCommand::Play)?;
    lib.0.with_state(|s| {
        s.current_song_id = Some(song_id);
        s.playback_status = PlaybackStatus::Playing;
    })
}

#[tauri::command]
pub fn toggle_play(pb: State<'_, PlaybackState>, lib: State<'_, AppState>) -> Result<PlaybackStatus, String> {
    let current = lib.0.get_state()?.playback_status;
    match current {
        PlaybackStatus::Playing => {
            pb.engine.send(PlaybackCommand::Pause)?;
            lib.0.with_state(|s| s.playback_status = PlaybackStatus::Paused)?;
            Ok(PlaybackStatus::Paused)
        }
        _ => {
            pb.engine.send(PlaybackCommand::Play)?;
            lib.0.with_state(|s| s.playback_status = PlaybackStatus::Playing)?;
            Ok(PlaybackStatus::Playing)
        }
    }
}

#[tauri::command]
pub fn set_volume(volume: f64, pb: State<'_, PlaybackState>, lib: State<'_, AppState>) -> Result<(), String> {
    pb.engine.send(PlaybackCommand::SetVolume(volume))?;
    lib.0.with_state(|s| {
        s.volume = volume.clamp(0.0, 1.0);
        if s.muted && volume > 0.0 { s.muted = false; }
    })
}

#[tauri::command]
pub fn toggle_mute(pb: State<'_, PlaybackState>, lib: State<'_, AppState>) -> Result<bool, String> {
    let state = lib.0.get_state()?;
    let new_muted = !state.muted;
    pb.engine.send(PlaybackCommand::SetMute(new_muted))?;
    lib.0.with_state(|s| s.muted = new_muted)?;
    Ok(new_muted)
}
