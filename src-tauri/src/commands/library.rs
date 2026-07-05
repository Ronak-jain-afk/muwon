use tauri::State;
use crate::core::Library;
use crate::models::Song;

pub struct AppState(pub Library);

#[tauri::command]
pub fn import_folder(path: String, lib: State<'_, AppState>) -> Result<Vec<Song>, String> {
    let scan_path = std::path::Path::new(&path);
    let files = crate::core::Scanner::scan_directory(scan_path);
    let mut added = Vec::new();
    let covers = std::path::Path::new(lib.0.covers_dir());

    for file_path in &files {
        let song = crate::core::Metadata::extract(file_path, covers);
        lib.0.add_song(&song).ok();
        added.push(song);
    }

    lib.0.rebuild_library_playlist().ok();

    if !added.is_empty() {
        let folder_name = std::path::Path::new(&path)
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("Imported");
        let playlist = lib.0.create_playlist(folder_name.to_string())?;
        lib.0.add_to_playlist(&playlist.id, &added.iter().map(|s| s.id.clone()).collect::<Vec<_>>())?;
    }

    Ok(added)
}

#[tauri::command]
pub fn get_all_songs(lib: State<'_, AppState>) -> Result<Vec<Song>, String> {
    lib.0.all_songs()
}
