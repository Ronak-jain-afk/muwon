use std::path::Path;
use rusqlite::{Connection, params};
use crate::models::{Song, Playlist};

/// Ponytail: single connection, WAL mode. Pool if concurrent
/// writes become a bottleneck (they won't for a single-user desktop app).
pub struct Persistence {
    conn: Connection,
}

impl Persistence {
    pub fn open(db_path: &Path) -> Result<Self, rusqlite::Error> {
        if let Some(parent) = db_path.parent() {
            let _ = std::fs::create_dir_all(parent);
        }
        let conn = Connection::open(db_path)?;
        conn.execute_batch("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;")?;
        let mut p = Self { conn };
        p.migrate()?;
        Ok(p)
    }

    fn migrate(&mut self) -> Result<(), rusqlite::Error> {
        self.conn.execute_batch(
            "CREATE TABLE IF NOT EXISTS songs (
                id              TEXT PRIMARY KEY,
                file_path       TEXT NOT NULL UNIQUE,
                title           TEXT NOT NULL,
                artist          TEXT NOT NULL DEFAULT '',
                album           TEXT NOT NULL DEFAULT '',
                duration        REAL NOT NULL DEFAULT 0,
                track_number    INTEGER,
                thumbnail_path  TEXT NOT NULL DEFAULT '',
                lyrics_path     TEXT NOT NULL DEFAULT '',
                format          TEXT NOT NULL DEFAULT '',
                embedded_cover  INTEGER NOT NULL DEFAULT 0,
                available       INTEGER NOT NULL DEFAULT 1,
                created_at      TEXT NOT NULL DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS playlists (
                id          TEXT PRIMARY KEY,
                name        TEXT NOT NULL,
                is_library  INTEGER NOT NULL DEFAULT 0,
                sort_order  INTEGER NOT NULL DEFAULT 0
            );

            CREATE TABLE IF NOT EXISTS playlist_songs (
                playlist_id TEXT NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
                song_id     TEXT NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
                position    INTEGER NOT NULL,
                PRIMARY KEY (playlist_id, song_id)
            );",
        )?;
        Ok(())
    }

    pub fn conn(&self) -> &Connection {
        &self.conn
    }

    // ── Songs ────────────────────────────────────────

    pub fn insert_song(&self, song: &Song) -> Result<(), rusqlite::Error> {
        self.conn.execute(
            "INSERT OR IGNORE INTO songs (id, file_path, title, artist, album, duration,
             track_number, thumbnail_path, lyrics_path, format, embedded_cover, available)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)",
            params![
                song.id, song.file_path, song.title, song.artist, song.album,
                song.duration, song.track_number, song.thumbnail_path, song.lyrics_path,
                song.format, song.embedded_cover as i32, song.available as i32
            ],
        )?;
        Ok(())
    }

    pub fn get_song(&self, id: &str) -> Result<Option<Song>, rusqlite::Error> {
        let mut stmt = self.conn.prepare(
            "SELECT id, file_path, title, artist, album, duration, track_number,
             thumbnail_path, lyrics_path, format, embedded_cover, available
             FROM songs WHERE id = ?1"
        )?;
        let mut rows = stmt.query(params![id])?;
        if let Some(row) = rows.next()? {
            Ok(Some(Song {
                id: row.get(0)?,
                file_path: row.get(1)?,
                title: row.get(2)?,
                artist: row.get(3)?,
                album: row.get(4)?,
                duration: row.get(5)?,
                track_number: row.get(6)?,
                thumbnail_path: row.get(7)?,
                lyrics_path: row.get(8)?,
                format: row.get(9)?,
                embedded_cover: row.get::<_, i32>(10)? != 0,
                available: row.get::<_, i32>(11)? != 0,
            }))
        } else {
            Ok(None)
        }
    }

    pub fn all_songs(&self) -> Result<Vec<Song>, rusqlite::Error> {
        let mut stmt = self.conn.prepare(
            "SELECT id, file_path, title, artist, album, duration, track_number,
             thumbnail_path, lyrics_path, format, embedded_cover, available
             FROM songs ORDER BY artist, album, title"
        )?;
        let rows = stmt.query_map([], |row| {
            Ok(Song {
                id: row.get(0)?,
                file_path: row.get(1)?,
                title: row.get(2)?,
                artist: row.get(3)?,
                album: row.get(4)?,
                duration: row.get(5)?,
                track_number: row.get(6)?,
                thumbnail_path: row.get(7)?,
                lyrics_path: row.get(8)?,
                format: row.get(9)?,
                embedded_cover: row.get::<_, i32>(10)? != 0,
                available: row.get::<_, i32>(11)? != 0,
            })
        })?;
        rows.collect()
    }

    pub fn song_exists(&self, id: &str) -> Result<bool, rusqlite::Error> {
        self.conn.query_row(
            "SELECT COUNT(*) FROM songs WHERE id = ?1",
            params![id],
            |row| row.get::<_, i32>(0),
        ).map(|count| count > 0)
    }

    // ── Playlists ────────────────────────────────────

    pub fn insert_playlist(&self, pl: &Playlist) -> Result<(), rusqlite::Error> {
        self.conn.execute(
            "INSERT OR IGNORE INTO playlists (id, name, is_library) VALUES (?1, ?2, ?3)",
            params![pl.id, pl.name, pl.is_library as i32],
        )?;
        // Insert playlist songs
        for (i, song_id) in pl.song_ids.iter().enumerate() {
            self.conn.execute(
                "INSERT OR IGNORE INTO playlist_songs (playlist_id, song_id, position) VALUES (?1, ?2, ?3)",
                params![pl.id, song_id, i as i32],
            )?;
        }
        Ok(())
    }

    pub fn get_playlists(&self) -> Result<Vec<Playlist>, rusqlite::Error> {
        let mut stmt = self.conn.prepare(
            "SELECT p.id, p.name, p.is_library,
                    COALESCE(GROUP_CONCAT(ps.song_id ORDER BY ps.position), '') as song_ids
             FROM playlists p
             LEFT JOIN playlist_songs ps ON ps.playlist_id = p.id
             GROUP BY p.id
             ORDER BY p.sort_order, p.name"
        )?;
        let rows = stmt.query_map([], |row| {
            let ids_str: String = row.get(3)?;
            let song_ids: Vec<String> = if ids_str.is_empty() {
                Vec::new()
            } else {
                ids_str.split(',').map(|s| s.to_string()).collect()
            };
            Ok(Playlist {
                id: row.get(0)?,
                name: row.get(1)?,
                is_library: row.get::<_, i32>(2)? != 0,
                song_ids,
            })
        })?;
        rows.collect()
    }

    pub fn add_songs_to_playlist(&self, playlist_id: &str, song_ids: &[String]) -> Result<(), rusqlite::Error> {
        let max_pos: i32 = self.conn.query_row(
            "SELECT COALESCE(MAX(position), -1) FROM playlist_songs WHERE playlist_id = ?1",
            params![playlist_id],
            |row| row.get(0),
        ).unwrap_or(-1);

        for (i, song_id) in song_ids.iter().enumerate() {
            self.conn.execute(
                "INSERT OR IGNORE INTO playlist_songs (playlist_id, song_id, position) VALUES (?1, ?2, ?3)",
                params![playlist_id, song_id, max_pos + 1 + i as i32],
            )?;
        }
        Ok(())
    }

}
