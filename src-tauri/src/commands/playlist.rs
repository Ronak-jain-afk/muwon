use tauri::State;
use crate::commands::library::AppState;
use crate::models::Playlist;

#[tauri::command]
pub fn get_playlists(lib: State<'_, AppState>) -> Result<Vec<Playlist>, String> {
    lib.0.get_playlists()
}

#[tauri::command]
pub fn create_playlist(name: String, lib: State<'_, AppState>) -> Result<Playlist, String> {
    lib.0.create_playlist(name)
}

#[tauri::command]
pub fn delete_playlist(id: String, lib: State<'_, AppState>) -> Result<(), String> {
    lib.0.delete_playlist(&id)
}

#[tauri::command]
pub fn add_to_playlist(playlist_id: String, song_ids: Vec<String>, lib: State<'_, AppState>) -> Result<(), String> {
    lib.0.add_to_playlist(&playlist_id, &song_ids)
}
