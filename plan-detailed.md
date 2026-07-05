# MuWon — Detailed Implementation Plan

> Lightweight Windows music player · Rust + Tauri v2 + SolidJS + Tailwind

---

## 1. PROJECT STRUCTURE

```
muwon/
├── src-tauri/                 # Rust backend
│   ├── src/
│   │   ├── main.rs            # Entry point, Tauri builder
│   │   ├── lib.rs             # Plugin registration, command exports
│   │   ├── commands/          # IPC command handlers (one file per domain)
│   │   │   ├── mod.rs
│   │   │   ├── library.rs     # scan, import, get-songs, get-playlists
│   │   │   ├── playback.rs    # play, pause, stop, seek, set-volume, mute
│   │   │   ├── queue.rs       # next, prev, add-to-queue, clear-queue
│   │   │   ├── playlist.rs    # create-playlist, add-song, remove-song, reorder
│   │   │   ├── lyrics.rs      # get-lyrics
│   │   │   └── settings.rs    # get/set settings
│   │   ├── core/              # Core engine modules
│   │   │   ├── mod.rs
│   │   │   ├── scanner.rs     # Directory walker, file collector
│   │   │   ├── metadata.rs    # Tag reading via lofty, thumbnail extraction
│   │   │   ├── library.rs     # In-memory library store + SQLite persistence
│   │   │   ├── playback.rs    # rodio/symphonia audio pipeline
│   │   │   ├── queue.rs       # Queue + shuffle + repeat logic
│   │   │   ├── lyrics.rs      # .lrc parser, time-sync lookup
│   │   │   ├── history.rs     # Navigation history stack
│   │   │   ├── persistence.rs # JSON/serde state save/load
│   │   │   ├── media_session.rs # Windows SMTC integration
│   │   │   └── watcher.rs     # notify-based folder watcher
│   │   ├── models/            # Shared data types
│   │   │   ├── mod.rs
│   │   │   ├── song.rs
│   │   │   ├── playlist.rs
│   │   │   ├── queue.rs
│   │   │   ├── state.rs       # AppState (volatile)
│   │   │   └── settings.rs
│   │   └── errors.rs          # Unified error type
│   ├── Cargo.toml
│   ├── tauri.conf.json
│   ├── capabilities/
│   ├── icons/
│   └── build.rs
├── src/                       # SolidJS frontend
│   ├── main.tsx               # Mount point
│   ├── App.tsx                # Root layout, router if any
│   ├── components/
│   │   ├── TitleBar.tsx        # Custom Windows title bar
│   │   ├── Sidebar.tsx         # Library / Playlists nav
│   │   ├── SongList.tsx        # Scrollable track table
│   │   ├── SongRow.tsx         # Single row in SongList
│   │   ├── SearchBar.tsx       # Filter by title/artist/album
│   │   ├── PlayerBar.tsx       # Bottom bar: controls + seek + volume
│   │   ├── AlbumArt.tsx        # Cover image display
│   │   ├── LyricsPane.tsx      # Synced lyrics display
│   │   ├── PlaylistDialog.tsx  # Create/edit playlist modal
│   │   ├── ImportDialog.tsx    # Folder picker + progress
│   │   ├── ContextMenu.tsx     # Right-click menu on tracks
│   │   ├── Visualizer.tsx      # Optional: waveform/spectrum
│   │   └── TrayMenu.tsx        # System tray interaction
│   ├── stores/                 # State management (signals)
│   │   ├── library.ts          # Songs + playlists
│   │   ├── player.ts           # Playback state
│   │   ├── queue.ts            # Queue + shuffle
│   │   ├── lyrics.ts           # Current lyrics
│   │   ├── settings.ts         # User preferences
│   │   └── ui.ts               # UI-only state (search, selection)
│   ├── lib/                    # Utilities
│   │   ├── commands.ts         # Typed wrappers around invoke()
│   │   ├── format.ts           # Time formatting, etc.
│   │   ├── cache.ts            # LRU thumbnail cache
│   │   └── types.ts            # Shared TS types mirroring Rust models
│   └── styles/
│       └── globals.css         # Tailwind base + custom
├── index.html
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── vite.config.ts
└── components.json             # shadcn config
```

---

## 2. TAURI IPC COMMANDS (Rust → Frontend)

All commands are async, return `Result<T, String>`.

### Library commands

| Command | Args | Returns | Description |
|---|---|---|---|
| `import_folder` | `path: String` | `Vec<Song>` | Scan folder, import new songs, return added |
| `get_all_songs` | — | `Vec<Song>` | Full library |
| `get_song` | `id: String` | `Song` | Single song |
| `get_playlists` | — | `Vec<Playlist>` | All playlists |
| `create_playlist` | `name: String` | `Playlist` | New empty playlist |
| `delete_playlist` | `id: String` | `()` | Remove playlist (not Library) |
| `add_to_playlist` | `playlist_id, song_ids: Vec<String>` | `()` | Append songs |
| `remove_from_playlist` | `playlist_id, song_id, index: usize` | `()` | Remove by index |
| `reorder_playlist` | `playlist_id, from, to: usize` | `()` | Drag-reorder |
| `search_songs` | `query: String` | `Vec<Song>` | Text search |
| `get_thumbnail` | `song_id: String` | `Vec<u8>` | Raw image bytes |
| `remove_missing_songs` | — | `usize` | Clean up unavailable |

### Playback commands

| Command | Args | Returns | Description |
|---|---|---|---|
| `load_and_play` | `song_id: String` | `()` | Load track + start playing |
| `load_paused` | `song_id: String` | `()` | Load track, stay paused |
| `play` | — | `()` | Resume |
| `pause` | — | `()` | Pause |
| `toggle_play` | — | `PlaybackStatus` | Toggle play/pause |
| `stop` | — | `()` | Stop + position=0 |
| `seek` | `seconds: f64` | `()` | Seek to position |
| `seek_relative` | `delta: f64` | `()` | Seek forward/back |
| `set_volume` | `volume: f64` | `()` | 0.0–1.0 |
| `toggle_mute` | — | `bool` | Toggle mute |

### Queue & navigation commands

| Command | Args | Returns | Description |
|---|---|---|---|
| `next_track` | — | `Option<String>` | Resolve next song ID |
| `prev_track` | — | `() ` | History-based previous |
| `add_to_queue` | `song_ids: Vec<String>` | `()` | Append to queue |
| `remove_from_queue` | `index: usize` | `()` | Remove queue item |
| `clear_queue` | — | `()` | Clear queue |
| `get_queue` | — | `Vec<Song>` | Current queue contents |
| `set_shuffle` | `enabled: bool` | `()` | Toggle shuffle |
| `set_repeat` | `mode: RepeatMode` | `()` | Set repeat mode |

### Settings & state commands

| Command | Args | Returns | Description |
|---|---|---|---|
| `get_state` | — | `AppState` | Full current state |
| `get_settings` | — | `Settings` | Persisted settings |
| `save_settings` | `settings: Settings` | `()` | Persist settings |
| `export_library` | `path: String` | `()` | Export as JSON |
| `import_library` | `path: String` | `()` | Import from JSON |

---

## 3. TAURI EVENTS (Backend → Frontend)

Events are emitted asynchronously from Rust to keep the UI in sync.

| Event name | Payload | When |
|---|---|---|
| `state-changed` | `AppState` | Any playback state change |
| `track-ended` | `song_id: String` | Natural end-of-track |
| `position-update` | `seconds: f64` | Every ~250ms during playback |
| `import-progress` | `{ current, total, file: String }` | During folder import |
| `import-complete` | `songs_added: usize` | Folder import done |
| `lyrics-update` | `{ synced, plain, current_line }` | Position-driven lyric sync |
| `settings-changed` | `Settings` | Settings persisted |
| `media-command` | `{ command: String }` | SMTC/OS media key inbound |

---

## 4. RUST CORE ENGINE — MODULE DETAIL

### 4.1 `scanner.rs`

```
walk directory recursively
→ collect files matching audio_extensions set
→ for each file:
    compute id = blake3 hash of canonical path
    check if id exists in DB → skip
    call metadata parser
    thumbnail resolution chain (embedded → same-name → cover/folder/front)
    lyrics resolution (same-name .lrc/.txt)
    return Vec<PendingSong>
batch insert into SQLite
```

### 4.2 `metadata.rs`

Uses `lofty` crate for tag reading:
- Title → `APIC`/`TPE1`/`TALB`/`TLEN` for ID3v2; Vorbis comments; MP4 atoms
- Duration → from audio stream length / sample rate
- Embedded cover → extract `APIC` frame data → write to `{app_data}/covers/{id}.jpg`
- Thumbnail priority chain embedded > same-name > cover/folder/front

### 4.3 `playback.rs`

- Uses `symphonia` for decoding + `rodio` for output
- Runs on a dedicated std::thread, communicates via channels
- Internal state machine: Idle → Loaded → Playing → Paused → Stopped
- Ring buffer: 2 x ~500ms PCM frames, decoder fills one while output consumes the other
- Position tracking: count samples consumed from the output device, convert to seconds
- Seek: flush buffer, re-enter decoder at new timestamp
- End-of-track detection: decoder returns `EndOfStream` → emit event

Thread safety: `Arc<Mutex<PlaybackEngine>>` wrapped in a struct behind `tauri::State`.

### 4.4 `queue.rs`

Pure logic, no I/O:
- Maintains `queue: VecDeque<SongId>`, `shuffled_sequence: Option<Vec<usize>>`
- `next(): Option<SongId>` — check queue first, then playlist with shuffle/repeat
- `previous(): Option<SongId>` — pop history stack
- Fisher-Yates shuffle with no-repeat-first constraint
- Shuffle on: place current track at shuffled_sequence[0], fill rest randomly
- Shuffle off: discard sequence, use linear index

### 4.5 `lyrics.rs`

- `.lrc` parser: regex `\[(\d+):(\d+\.?\d*)\](.*)` per line
- Build `Vec<LyricLine { time: f64, text: String }>` sorted
- Binary search by `position` to find active line
- `.txt`: return raw string, no sync
- Plain lyrics also cached on track load

### 4.6 `history.rs`

- `VecDeque<HistoryEntry { song_id, position, playlist_id }>` with max 100
- `push(entry)` — push, truncate if over max
- `pop() -> Option<HistoryEntry>` — most recent
- `clear()`

### 4.7 `persistence.rs`

- On app exit: serialize `AppState` (library, playlists, queue, history, settings) to JSON via serde
- Write to `{app_data}/state.json`
- On startup: read & deserialize; validate song files still exist (mark missing)
- Throttled autosave: debounce writes with 1s interval on change events

### 4.8 `media_session.rs`

Windows SMTC (SystemMediaTransportControls) via `windows-rs` crate:
- Register `SystemMediaTransportControls` on startup
- Update display: title, artist, album, thumbnail
- Subscribe to button events: play, pause, next, previous
- Forward events to playback engine via channel

### 4.9 `watcher.rs`

- Uses `notify` crate
- Watch imported directories for `Create` events
- On new file: auto-import if extension matches
- Debounce rapid events (batched by path, 2s window)

---

## 5. SQLITE SCHEMA

```sql
CREATE TABLE songs (
    id          TEXT PRIMARY KEY,         -- blake3 hash of absolute path
    file_path   TEXT NOT NULL UNIQUE,
    title       TEXT NOT NULL,
    artist      TEXT NOT NULL DEFAULT '',
    album       TEXT NOT NULL DEFAULT '',
    duration    REAL NOT NULL DEFAULT 0,
    track_number INTEGER,
    thumbnail_path TEXT NOT NULL DEFAULT '',
    lyrics_path TEXT NOT NULL DEFAULT '',
    format      TEXT NOT NULL DEFAULT '',
    embedded_cover INTEGER NOT NULL DEFAULT 0,
    available   INTEGER NOT NULL DEFAULT 1,  -- 0 if file disappeared
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE playlists (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    is_library  INTEGER NOT NULL DEFAULT 0,
    sort_order  INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE playlist_songs (
    playlist_id TEXT NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
    song_id     TEXT NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
    position    INTEGER NOT NULL,
    PRIMARY KEY (playlist_id, song_id)
);

CREATE TABLE settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

-- Global library is a special playlist with is_library=1
-- Insert default Library playlist on first run
```

---

## 6. FRONTEND COMPONENT TREE

```
App
├── TitleBar                 (custom: traffic lights + title + menu button)
├── MainLayout
│   ├── Sidebar
│   │   ├── LibraryButton    (click → show all songs)
│   │   ├── PlaylistList
│   │   │   └── PlaylistItem (per playlist, click to select)
│   │   ├── NowPlayingCard   (mini current track info)
│   │   └── ImportButton     (opens folder picker)
│   └── ContentArea
│       ├── SearchBar        (filter input)
│       ├── SongList
│       │   └── SongRow[]    (virtualized for 10k+ tracks)
│       │       └── ContextMenu
│       └── LyricsPane       (optional, toggleable)
└── PlayerBar                (fixed bottom)
    ├── AlbumArt (small)
    ├── TrackInfo            (title + artist)
    ├── PlaybackControls     (prev, play/pause, next)
    ├── SeekBar              (progress slider + time labels)
    ├── VolumeControl        (slider + mute button)
    └── ExtraControls        (shuffle, repeat, queue, lyrics toggle)
```

### 6.1 Layout strategy

```
┌──────────────────────────────────────────────┐
│ TitleBar                                      │
├────────┬─────────────────────────────────────┤
│        │                                      │
│ Sidebar │  ContentArea                        │
│ 250px   │  (flex 1)                          │
│        │                                      │
├────────┴─────────────────────────────────────┤
│ PlayerBar (fixed, ~80px)                     │
└──────────────────────────────────────────────┘
```

Uses CSS Grid for the main layout. Sidebar collapsible to icons-only (64px).

### 6.2 Virtual scrolling

For SongList, use a windowed/virtualized list. Only render ~40 rows regardless of total library size. Use `@tanstack/solid-virtual` or a lightweight custom virtualizer.

### 6.3 Window chrome

- `decorations: false` in tauri.conf.json
- Custom TitleBar component handles drag region (`data-tauri-drag-region`)
- Minimize, maximize/restore, close buttons
- Double-click TitleBar to maximize

### 6.4 Keyboard shortcuts

| Shortcut | Action |
|---|---|
| Space | Play/Pause |
| Ctrl+→ | Next |
| Ctrl+← | Previous |
| Ctrl+↑ | Volume up |
| Ctrl+↓ | Volume down |
| M | Toggle mute |
| S | Toggle shuffle |
| R | Cycle repeat |
| / | Focus search |
| Enter (in search) | Play first result |
| Delete | Remove from playlist |
| Ctrl+A | Select all visible |

---

## 7. STATE MANAGEMENT (SolidJS Signals)

### `stores/library.ts`
```ts
const [songs, setSongs] = createStore<Map<string, Song>>(new Map())
const [playlists, setPlaylists] = createStore<Playlist[]>([])
const [activePlaylistId, setActivePlaylistId] = createSignal<string | null>(null)
const [searchQuery, setSearchQuery] = createSignal('')
// Derived: filteredSongs computed from songs + searchQuery + activePlaylistId
```

### `stores/player.ts`
```ts
const [currentSong, setCurrentSong] = createSignal<Song | null>(null)
const [status, setStatus] = createSignal<'playing' | 'paused' | 'stopped'>('stopped')
const [position, setPosition] = createSignal(0)
const [duration, setDuration] = createSignal(0)
const [volume, setVolume] = createSignal(0.8)
const [muted, setMuted] = createSignal(false)
```

### `stores/queue.ts`
```ts
const [queue, setQueue] = createStore<Song[]>([])
const [shuffle, setShuffle] = createSignal(false)
const [repeat, setRepeat] = createSignal<'off' | 'one' | 'all'>('off')
```

### `stores/lyrics.ts`
```ts
const [lyrics, setLyrics] = createSignal<LyricLine[] | null>(null)
const [plainLyrics, setPlainLyrics] = createSignal<string | null>(null)
const [currentLine, setCurrentLine] = createSignal<number>(-1)
```

### Data flow
1. User clicks play → frontend calls `invoke('load_and_play', { songId })`
2. Rust starts playback, emits `state-changed` event
3. Frontend listens to `state-changed`, updates signals
4. Rust emits `position-update` ~4/sec → frontend updates seek bar
5. Rust emits `lyrics-update` → frontend highlights current line

---

## 8. BUILD PHASES

### Phase 1 — Scaffold & Shell (days 1–2)
- `npm create tauri-app` with SolidJS + TypeScript + Vite
- Configure Tailwind, shadcn/ui
- Custom title bar with window controls
- Sidebar + content area + player bar layout
- Basic routing (or just state-driven views)
- Verify: empty app launches, window controls work, layout is correct

### Phase 2 — Library Import (days 3–5)
- Rust: scanner + metadata + SQLite setup
- `import_folder` command with recursive walk
- Tag reading via `lofty`, thumbnail extraction
- Frontend: ImportDialog (folder picker), progress display
- Frontend: SongList with virtual scrolling
- Frontend: Server-side search (SQLite LIKE)

### Phase 3 — Playback Engine (days 6–10)
- Rust: symphonia + rodio integration
- State machine (Idle/Loaded/Playing/Paused/Stopped)
- Seek, volume, mute
- Position tracking and event emission
- Frontend: PlayerBar with working controls, seek slider, volume slider
- Frontend: Auto-play after track click

### Phase 4 — Queue & Navigation (days 11–13)
- Rust: QueueManager with shuffle/repeat
- Next/Previous with history stack
- Fisher-Yates shuffle, repeat modes
- Queue management commands
- Frontend: Shuffle/repeat toggles, next/prev buttons
- Frontend: Queue panel (optional drawer)

### Phase 5 — Playlists (days 14–15)
- Rust: CRUD for playlists, playlist_songs
- Frontend: Playlist sidebar list
- Frontend: Create/delete playlist dialog
- Frontend: Add/remove/reorder songs in playlist
- Frontend: Drag-to-reorder

### Phase 6 — Lyrics (day 16)
- Rust: .lrc parser, time-sync binary search
- Frontend: LyricsPane with sync highlighting
- Auto-scroll to current line

### Phase 7 — Persistence & Settings (day 17)
- JSON state save/load on exit/startup
- Autosave throttle
- Settings dialog (theme, audio extensions, etc.)
- Remember window size/position

### Phase 8 — OS Integration (days 18–19)
- Windows SMTC via `windows-rs`
- System tray (minimize to tray, tray menu)
- Media keys handling
- Single-instance lock

### Phase 9 — Polish (days 20–22)
- Smooth animations (Motion One)
- Loading states and empty states
- Error toasts
- Keyboard shortcuts
- Context menus on tracks
- Dark/light theme toggle
- Mini visualizer (optional)

---

## 9. KEY CONSTRAINTS & DESIGN DECISIONS

| Decision | Choice | Rationale |
|---|---|---|
| State persistence | JSON via serde | Simple, human-readable, no migration needed |
| Audio decoding | symphonia (decode) + rodio (output) | Symphonia handles all formats, rodio is pure-Rust audio output |
| Tag parsing | lofty | Best Rust crate for audio metadata, supports all formats |
| Database | SQLite via rusqlite | Embedded, zero-config, reliable for 10k+ songs |
| Thumbnail cache | Filesystem `{app_data}/covers/` | LRU in frontend to avoid loading stale, filesystem for persistence |
| Window decorations | None (custom title bar) | Needed for seamless dark theme + modern look |
| Shuffle algorithm | Fisher-Yates with no-repeat-first | Standard algorithm, predictable, no bias |
| History max | 100 entries | <1KB memory, prevents unbounded growth |
| Autosave throttle | 1 second debounce | Avoids I/O spam on rapid state changes |
| Seek bar update rate | 4 Hz (250ms) | Smooth enough, low CPU |
| Virtual scroll window | 40 rows | Smooth scrolling with any library size |

---

## 10. DEPENDENCIES

### Rust (`Cargo.toml`)

```toml
[dependencies]
tauri = { version = "2", features = ["tray-icon", "protocol-asset"] }
tauri-plugin-dialog = "2"
tauri-plugin-fs = "2"
tauri-plugin-shell = "2"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
symphonia = { version = "0.5", features = ["all"] }
rodio = "0.19"
lofty = "0.20"
rusqlite = { version = "0.31", features = ["bundled"] }
notify = "6"
blake3 = "1"
image = "0.25"
windows = { version = "0.56", features = ["Media", "System"] }
chrono = "0.4"
uuid = { version = "1", features = ["v4"] }
log = "0.4"
env_logger = "0.11"
```

### Frontend (`package.json`)

```json
{
  "dependencies": {
    "@tauri-apps/api": "^2",
    "@tauri-apps/plugin-dialog": "^2",
    "@tauri-apps/plugin-fs": "^2",
    "solid-js": "^1.9",
    "@tanstack/solid-virtual": "^3",
    "tailwindcss": "^4",
    "lucide-solid": "^0.460",
    "motion": "^11",
    "class-variance-authority": "^0.7",
    "clsx": "^2",
    "tailwind-merge": "^2"
  }
}
```

No additional state management library needed — SolidJS `createSignal`/`createStore` handles it natively.

---

## 11. PERFORMANCE TARGETS

| Metric | Target |
|---|---|
| App cold start | < 500ms to visible UI |
| Library scan (10k files) | < 30s (with tag parsing) |
| Track load-to-play | < 200ms |
| Memory (idle, 1 track loaded) | < 60 MB |
| Memory (10k songs in library) | < 120 MB |
| Thumbnail cache | 50 images LRU |
| CPU (playback only) | < 2% on modern CPU |
| Binary size (compressed) | < 15 MB |

---

## 12. EDGE CASES & RESILIENCE

- **File deleted mid-playback**: catch I/O error in decoder thread → emit track-ended → skip to next
- **Corrupt audio file**: symphonia returns error → same as above
- **No audio device**: rodio `OutputStream::try_default()` fails → show "No audio output" toast
- **Empty library**: disable play/next/prev, show "Import music to get started" screen
- **Single song playlist**: shuffle does nothing, repeat one works, repeat all loops
- **Concurrent commands**: all state mutations go through `Arc<Mutex<>>` or channels
- **Rapid next/prev**: commands are queued on a channel, processed sequentially
- **Import same folder twice**: skip existing by `id` hash, only add new files
- **Unicode file paths**: Rust `PathBuf` handles it; frontend encodes for URLs
- **App crash**: state.json may be stale; on next boot, validate all `file_path` existence
- **Window hidden during playback**: tray icon keeps process alive; audio thread continues

---

## 13. POSSIBLE FUTURE EXTENSIONS (not in v1)

- Equalizer (audio filter graph)
- Crossfade between tracks
- Podcast support (resume position per track)
- Remote control (HTTP/MQTT)
- Last.fm scrobbling
- ReplayGain normalization
- WASAPI exclusive mode (bit-perfect)
- Hi-Res audio support (>48kHz)
- Folder-based browsing (not just flat library)
- Tag editing
- Batch file renaming
