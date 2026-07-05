pub mod commands;
pub mod core;
pub mod models;

use commands::library::AppState;
use commands::playback::PlaybackState;
use core::{Library, PlaybackEngine, PlaybackEvent};
use std::thread;
use tauri::{Emitter, Manager};

fn app_data_dir() -> std::path::PathBuf {
    let exe = std::env::current_exe().unwrap_or_default();
    let parent = exe.parent().unwrap_or(std::path::Path::new("."));
    parent.join("muwon_data")
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let data_dir = app_data_dir();
    let _ = std::fs::create_dir_all(&data_dir);
    let covers_dir = data_dir.join("covers");
    let _ = std::fs::create_dir_all(&covers_dir);

    let db_path = data_dir.join("library.db");
    let library = Library::new(
        db_path.to_str().unwrap_or("muwon.db"),
        covers_dir.to_str().unwrap_or("covers"),
    );

    let engine = PlaybackEngine::new();

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .manage(AppState(library))
        .manage(PlaybackState { engine })
        .setup(|app| {
            let handle = app.handle().clone();
            thread::spawn(move || {
                let engine_state: tauri::State<PlaybackState> = handle.state();
                loop {
                    if let Some(event) = engine_state.inner().engine.try_recv_event() {
                        match &event {
                            PlaybackEvent::Position(pos) => {
                                let _ = handle.emit("position-update", pos);
                            }
                            PlaybackEvent::Duration(dur) => {
                                let _ = handle.emit("duration", dur);
                            }
                            PlaybackEvent::Loaded(_) => {}
                            PlaybackEvent::Playing => {
                                let _ = handle.emit("state-changed", "playing");
                            }
                            PlaybackEvent::Paused => {
                                let _ = handle.emit("state-changed", "paused");
                            }
                            PlaybackEvent::Stopped => {
                                let _ = handle.emit("state-changed", "stopped");
                            }
                            PlaybackEvent::EndOfTrack => {}
                            PlaybackEvent::Error(_) => {}
                        }
                    } else {
                        thread::sleep(std::time::Duration::from_millis(10));
                    }
                }
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::library::import_folder,
            commands::library::get_all_songs,
            commands::playback::load_and_play,
            commands::playback::toggle_play,
            commands::playback::set_volume,
            commands::playback::toggle_mute,
            commands::queue::set_shuffle,
            commands::queue::set_repeat,
            commands::queue::get_state,
            commands::queue::next_track,
            commands::queue::prev_track,
            commands::queue::add_to_queue,
            commands::queue::remove_from_queue,
            commands::queue::clear_queue,
            commands::queue::get_queue,
            commands::playlist::get_playlists,
            commands::playlist::create_playlist,
            commands::playlist::delete_playlist,
            commands::playlist::add_to_playlist,
        ])
        .run(tauri::generate_context!())
        .expect("error while running muwon");
}
