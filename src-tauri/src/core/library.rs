use std::sync::Mutex;
use crate::models::{Song, Playlist, AppState};
use crate::core::{Persistence, QueueManager, History, HistoryEntry};

pub struct Library {
    db: Mutex<Persistence>,
    state: Mutex<AppState>,
    queue: Mutex<QueueManager>,
    history: Mutex<History>,
    covers_dir: String,
}

impl Library {
    pub fn new(db_path: &str, covers_dir: &str) -> Self {
        let db = Persistence::open(std::path::Path::new(db_path))
            .expect("Failed to open database");

        let playlists = db.get_playlists().unwrap_or_default();
        let has_library = playlists.iter().any(|p| p.is_library);
        if !has_library {
            let _ = db.insert_playlist(&Playlist {
                id: "__library__".to_string(),
                name: "Library".to_string(),
                song_ids: Vec::new(),
                is_library: true,
            });
        }

        Self {
            db: Mutex::new(db),
            state: Mutex::new(AppState::default()),
            queue: Mutex::new(QueueManager::new()),
            history: Mutex::new(History::new(100)),
            covers_dir: covers_dir.to_string(),
        }
    }

    pub fn covers_dir(&self) -> &str { &self.covers_dir }

    // ── Songs ────────────────────────────────────────

    pub fn add_song(&self, song: &Song) -> Result<(), String> {
        self.db.lock().map_err(|e| e.to_string())?.insert_song(song).map_err(|e| e.to_string())
    }
    pub fn get_song(&self, id: &str) -> Result<Option<Song>, String> {
        self.db.lock().map_err(|e| e.to_string())?.get_song(id).map_err(|e| e.to_string())
    }
    pub fn all_songs(&self) -> Result<Vec<Song>, String> {
        self.db.lock().map_err(|e| e.to_string())?.all_songs().map_err(|e| e.to_string())
    }
    pub fn song_exists(&self, id: &str) -> Result<bool, String> {
        self.db.lock().map_err(|e| e.to_string())?.song_exists(id).map_err(|e| e.to_string())
    }

    // ── Playlists ────────────────────────────────────

    pub fn get_playlists(&self) -> Result<Vec<Playlist>, String> {
        self.db.lock().map_err(|e| e.to_string())?.get_playlists().map_err(|e| e.to_string())
    }
    pub fn create_playlist(&self, name: String) -> Result<Playlist, String> {
        let pl = Playlist {
            id: uuid::Uuid::new_v4().to_string(), name,
            song_ids: Vec::new(), is_library: false,
        };
        self.db.lock().map_err(|e| e.to_string())?.insert_playlist(&pl).map_err(|e| e.to_string())?;
        Ok(pl)
    }
    pub fn delete_playlist(&self, id: &str) -> Result<(), String> {
        let db = self.db.lock().map_err(|e| e.to_string())?;
        db.conn().execute("DELETE FROM playlists WHERE id = ?1 AND is_library = 0", rusqlite::params![id])
            .map_err(|e| e.to_string())?;
        db.conn().execute("DELETE FROM playlist_songs WHERE playlist_id = ?1", rusqlite::params![id])
            .map_err(|e| e.to_string())?;
        Ok(())
    }
    pub fn add_to_playlist(&self, playlist_id: &str, song_ids: &[String]) -> Result<(), String> {
        self.db.lock().map_err(|e| e.to_string())?.add_songs_to_playlist(playlist_id, song_ids).map_err(|e| e.to_string())
    }
    pub fn rebuild_library_playlist(&self) -> Result<(), String> {
        let db = self.db.lock().map_err(|e| e.to_string())?;
        db.conn().execute("DELETE FROM playlist_songs WHERE playlist_id = '__library__'", []).map_err(|e| e.to_string())?;
        let songs = db.all_songs().map_err(|e| e.to_string())?;
        for (i, s) in songs.iter().enumerate() {
            db.conn().execute("INSERT INTO playlist_songs (playlist_id, song_id, position) VALUES (?1, ?2, ?3)",
                rusqlite::params!["__library__", s.id, i as i32]).map_err(|e| e.to_string())?;
        }
        Ok(())
    }

    // ── Queue ────────────────────────────────────────

    pub fn add_to_queue(&self, song_ids: Vec<String>) -> Result<(), String> {
        self.queue.lock().map_err(|e| e.to_string())?.add_to_queue(song_ids);
        Ok(())
    }
    pub fn remove_from_queue(&self, index: usize) -> Result<(), String> {
        self.queue.lock().map_err(|e| e.to_string())?.remove_from_queue(index);
        Ok(())
    }
    pub fn clear_queue(&self) -> Result<(), String> {
        self.queue.lock().map_err(|e| e.to_string())?.clear_queue();
        Ok(())
    }
    pub fn get_queue_ids(&self) -> Result<Vec<String>, String> {
        let q = self.queue.lock().map_err(|e| e.to_string())?;
        Ok(q.get_queue().iter().cloned().collect())
    }

    /// Resolve next track using the QueueManager.
    pub fn next_track(&self) -> Result<Option<String>, String> {
        let state = self.state.lock().map_err(|e| e.to_string())?;
        let playlists = self.get_playlists()?;
        let active_id = state.active_playlist_id.as_deref().unwrap_or("__library__");
        let ids = playlists.iter()
            .find(|p| p.id == active_id)
            .map(|p| p.song_ids.clone())
            .unwrap_or_default();

        let current = state.current_song_id.as_deref();
        let mut q = self.queue.lock().map_err(|e| e.to_string())?;
        Ok(q.next(current, &ids))
    }

    /// Resolve previous track using History.
    pub fn prev_track(&self) -> Result<Option<HistoryEntry>, String> {
        let mut h = self.history.lock().map_err(|e| e.to_string())?;
        Ok(h.pop())
    }

    pub fn push_history(&self, entry: HistoryEntry) -> Result<(), String> {
        self.history.lock().map_err(|e| e.to_string())?.push(entry);
        Ok(())
    }

    pub fn set_shuffle(&self, enabled: bool) -> Result<(), String> {
        let active_id = {
            let state = self.state.lock().map_err(|e| e.to_string())?;
            state.active_playlist_id.clone().unwrap_or("__library__".to_string())
        };
        let playlists = self.get_playlists()?;
        let len = playlists.iter().find(|p| p.id == active_id).map(|p| p.song_ids.len()).unwrap_or(0);
        let mut q = self.queue.lock().map_err(|e| e.to_string())?;
        let mut state = self.state.lock().map_err(|e| e.to_string())?;
        q.set_shuffle(enabled, 0, len);
        state.shuffle_enabled = enabled;
        Ok(())
    }

    pub fn set_repeat(&self, mode: crate::models::RepeatMode) -> Result<(), String> {
        self.queue.lock().map_err(|e| e.to_string())?.set_repeat_mode(mode);
        self.state.lock().map_err(|e| e.to_string())?.repeat_mode = mode;
        Ok(())
    }

    // ── State ────────────────────────────────────────

    pub fn get_state(&self) -> Result<AppState, String> {
        Ok(self.state.lock().map_err(|e| e.to_string())?.clone())
    }
    pub fn with_state<F, R>(&self, f: F) -> Result<R, String>
    where F: FnOnce(&mut AppState) -> R {
        let mut guard = self.state.lock().map_err(|e| e.to_string())?;
        Ok(f(&mut *guard))
    }

}
