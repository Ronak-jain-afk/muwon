use tauri::State;
use crate::commands::library::AppState;
use crate::models::RepeatMode;

#[tauri::command]
pub fn set_shuffle(enabled: bool, lib: State<'_, AppState>) -> Result<(), String> {
    lib.0.set_shuffle(enabled)
}

#[tauri::command]
pub fn set_repeat(mode: RepeatMode, lib: State<'_, AppState>) -> Result<(), String> {
    lib.0.set_repeat(mode)
}

#[tauri::command]
pub fn get_state(lib: State<'_, AppState>) -> Result<crate::models::AppState, String> {
    lib.0.get_state()
}

#[tauri::command]
pub fn next_track(lib: State<'_, AppState>) -> Result<Option<String>, String> {
    // Push current track to history before moving
    let state = lib.0.get_state()?;
    if let Some(song_id) = &state.current_song_id {
        lib.0.push_history(crate::core::HistoryEntry {
            song_id: song_id.clone(),
            position: state.position,
        })?;
    }
    lib.0.next_track()
}

#[tauri::command]
pub fn prev_track(lib: State<'_, AppState>) -> Result<Option<String>, String> {
    let entry = lib.0.prev_track()?;
    Ok(entry.map(|e| e.song_id))
}

#[tauri::command]
pub fn add_to_queue(song_ids: Vec<String>, lib: State<'_, AppState>) -> Result<(), String> {
    lib.0.add_to_queue(song_ids)
}

#[tauri::command]
pub fn remove_from_queue(index: usize, lib: State<'_, AppState>) -> Result<(), String> {
    lib.0.remove_from_queue(index)
}

#[tauri::command]
pub fn clear_queue(lib: State<'_, AppState>) -> Result<(), String> {
    lib.0.clear_queue()
}

#[tauri::command]
pub fn get_queue(lib: State<'_, AppState>) -> Result<Vec<crate::models::Song>, String> {
    let ids = lib.0.get_queue_ids()?;
    let mut songs = Vec::new();
    for id in &ids {
        if let Some(song) = lib.0.get_song(id)? {
            songs.push(song);
        }
    }
    Ok(songs)
}
