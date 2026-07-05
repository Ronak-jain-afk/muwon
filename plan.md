

## 1. SYSTEM ARCHITECTURE (Logical Modules)

1. **File System Interface** – responsible for scanning directories, reading files, and watching for changes.
2. **Metadata Parser** – extracts tags from audio files, reads thumbnail/lyrics files.
3. **Library Manager** – maintains the master list of `Song` objects and any user‑defined playlists.
4. **Playback Engine** – controls audio stream, timing, and track transitions; runs on a dedicated thread.
5. **Queue Manager** – handles the play queue, shuffle index, repeat mode, and next‑track resolution.
6. **Lyrics Manager** – loads, parses, and provides time‑synchronised lyrics data.
7. **State Persistence** – saves/loads all volatile state to disk.
8. **Media Session Bridge** – communicates playback state to the OS (media keys, taskbar controls).
9. **Background Service** – keeps the audio thread alive when the window is hidden.

All modules communicate via a central **Application State** object that holds current song, playlist, queue, and settings.

---

## 2. DATA MODELS (Logical Entities)

### 2.1 Song
- `id` : unique string (hash of absolute file path)
- `filePath` : absolute path to audio file
- `title` : string
- `artist` : string
- `album` : string
- `duration` : floating‑point seconds (total length)
- `thumbnailPath` : absolute path to image file, or empty if none
- `lyricsPath` : absolute path to lyrics file (.lrc / .txt), or empty if none
- `format` : string (mp3, flac, etc.)
- `embeddedCover` : boolean (whether the thumbnail was extracted from the audio file’s tags)

### 2.2 Playlist
- `id` : unique string
- `name` : string (e.g., “Library”, “Favorites”)
- `songIds` : ordered list of `Song.id` (references)
- `isLibrary` : boolean (the default playlist containing all imported songs)

### 2.3 Queue
- `items` : ordered list of `Song.id` (separate from any playlist)
- `nextIndex` : pointer to the current position in the queue (or null if empty)

### 2.4 Application State (Volatile)
- `currentSongId` : currently loaded track (or null)
- `playbackStatus` : enum { Playing, Paused, Stopped }
- `position` : seconds elapsed in current track
- `volume` : 0.0 – 1.0
- `muted` : boolean
- `shuffleEnabled` : boolean
- `repeatMode` : enum { Off, One, All }
- `activePlaylistId` : the playlist currently being used as the source for playback
- `shuffledSequence` : ordered list of indices (relative to the active playlist) used when shuffle is on; null otherwise
- `history` : stack of `(playlistId, songId, position)` for previous‑track navigation

---

## 3. FOLDER IMPORT LOGIC

### 3.1 User Action
User selects a directory. The import process runs entirely on a background thread to keep the app responsive.

### 3.2 Scan Procedure
1. Walk the directory tree recursively.
2. Collect all files with extensions matching a configurable list: `.mp3`, `.m4a`, `.flac`, `.ogg`, `.opus`, `.wav`, `.wma`, `.aac`.
3. For each audio file found:
   a. Compute `id` = hash of its absolute path (to uniquely identify it even if moved later).
   b. If an existing `Song` with that `id` is already in the library, skip (avoid duplicates).
   c. Otherwise, create a new `Song` with `filePath`.
   d. Extract metadata (title, artist, album, duration) via tag reading libraries. If no title tag exists, use the filename without extension as title. If no artist/album tags, leave them empty.
   e. **Thumbnail resolution** (in order of priority):
      - Check if audio file contains embedded cover art (ID3v2 APIC / FLAC picture / MP4 covr). If yes, extract it, save it as a file in a dedicated application cache folder (e.g., `covers/<songId>.jpg`), and set `thumbnailPath` to that cached file path. Set `embeddedCover = true`.
      - Else, look in the same directory as the audio file for an image file named exactly the same as the audio file but with a common image extension (`.jpg`, `.jpeg`, `.png`, `.webp`). For example, `song.mp3` → `song.jpg`. If found, set `thumbnailPath` to its absolute path.
      - Else, look for files named `cover`, `folder`, `albumart`, `front` with any of those extensions. If found, use it.
      - If none, `thumbnailPath` remains empty.
   f. **Lyrics resolution**:
      - Look in the same directory for a file with the same base name as the audio file and the extension `.lrc` (preferred) or `.txt`. For example, `song.mp3` → `song.lrc`.
      - If found, set `lyricsPath` to its absolute path.
      - If not, check for a file named exactly `lyrics.lrc` or `lyrics.txt` in the directory (convention for single‑file albums). Use it only if it’s reasonably unambiguous (e.g., directory contains only one audio file or all tracks share the same lyrics? Best to associate only by base name to avoid mismatches). **Decision**: stick to base‑name matching to be safe.
   g. Add the new `Song` to the global library (a map/dictionary of id → Song).
4. After the scan completes, the default “Library” playlist is rebuilt: it is an ordered list of all `Song.id`, sorted alphabetically by (artist, album, track number metadata if available, then filename) for a predictable default order.

### 3.3 Incremental Import
- If the same folder is imported again, only new or missing files are added. Removed files (no longer present) are kept in the library but marked as “unavailable”; when playback attempts to load them, an error is raised and the track is skipped automatically.
- A file watcher can optionally monitor the folder for real‑time additions, triggering re‑scan of the changed sub‑tree.

---

## 4. PLAYBACK ENGINE – CORE LOGIC

### 4.1 Audio Pipeline
- Runs on a high‑priority thread separate from the UI.
- Uses a platform audio output (e.g., WASAPI on Windows) with a ring buffer.
- Decoding is streamed: data is read from the file, decoded into PCM, and pushed to the buffer.
- The engine maintains an internal clock (`elapsed`), incremented based on audio samples consumed, for precise position reporting.

### 4.2 State Machine
States: **Idle** (no track loaded), **Loaded** (track ready but not playing), **Playing**, **Paused**, **Stopped** (track ended or user‑stopped).

Transitions:
- **Load(songId)** → from any state: stop current playback, close previous audio stream, open new file, decode initial buffer, move to Loaded, set position = 0, notify listeners of new track.
- **Play** → from Paused: resume audio, state → Playing.
- **Play** → from Loaded or Stopped (position = 0): start audio, state → Playing.
- **Pause** → from Playing: halt audio output, preserve position, state → Paused.
- **Stop** → from Playing/Paused: halt, position → 0, state → Stopped, optionally unload resources after a timeout.
- **Seek(seconds)** → from Playing/Paused/Loaded: flush audio buffer, reposition file read pointer, update `position`, re‑buffer, resume if was Playing.
- **End‑of‑track** → reached when `position >= duration`. Engine automatically calls the **track‑ended handler** (Queue Manager decides next track).

### 4.3 End‑of‑track Automatic Handling
When the audio stream naturally finishes:
1. If **Repeat One** is active: reload the same song from the beginning (position = 0) and continue playing.
2. Else, call the Queue Manager to determine the **next song id**.
3. If a next song exists:
   - Push the just‑finished song onto the history stack (with its id and the fact it played to completion).
   - Load the next song, set position = 0, and automatically start playing (unless paused by user before transition? No, auto‑play).
4. If no next song (e.g., end of playlist and Repeat Off):
   - Set state to Stopped, position = 0, `currentSongId` unchanged, and notify that playback has stopped.

### 4.4 History Stack Management
- A stack (Last‑In, First‑Out) stores records of `{playlistId, songId, position}` whenever a new track starts (including when user manually clicks a track or next/previous).
- When the user triggers “Previous”, the stack is popped to retrieve the previous track and its resume position (see §8.3).
- Maximum stack depth: configurable (e.g., 100 entries) to avoid memory growth.

---

## 5. QUEUE & SHUFFLE LOGIC (EXTREME DETAIL)

The Queue Manager is the brain for selecting the next track.

### 5.1 Data Structures
- `activePlaylist` : reference to a Playlist object (the user’s chosen playlist, including the default Library).
- `queue` : a list of `songId` explicitly added by the user (these are *not* in the playlist sequence).
- `shuffleEnabled` : boolean
- `shuffledSequence` : an array of indices (0‑based, relative to `activePlaylist.songIds`) that represents the random order. It is generated only when shuffle is turned on, and it is immediately fully shuffled.
- `currentSequenceIndex` : the position within the currently‑used order. When shuffle is off, it’s an index into `activePlaylist.songIds` (linear playback). When shuffle is on, it’s an index into `shuffledSequence`.

### 5.2 Determining the “Next Track”
The process is invoked on end‑of‑track or when user presses “Next”.

**Step 1: Check Queue**
- If `queue` is not empty:
  - Remove the first element of `queue` (FIFO).
  - Return that `songId` as the next track.
  - (Do not change `currentSequenceIndex` or history stack in the same way; see queue history handling §5.5)

**Step 2: No Queue – Use Playlist Sequence**
- If `queue` is empty, proceed based on `shuffleEnabled` and `repeatMode`.
- Let `sourceList` = `activePlaylist.songIds` (array of song ids).
- Let `currentPos` be the current track’s index in `sourceList` (searched by song id). If not found (e.g., track removed), reset to 0 or skip to next valid; edge case: if playlist empty, stop.

**Case A: Shuffle Off**
- The sequence is simply `sourceList`.
- Next index = `currentPos + 1`.
- If next index >= length of `sourceList`:
  - If `repeatMode == All`: next index = 0 (loop).
  - Else (`repeatMode == Off`): return `null` (stop).
- Else: next index = calculated index.

**Case B: Shuffle On**
- If no `shuffledSequence` exists (first enable), generate one (see §5.3).
- The `shuffledSequence` contains permuted indices of `sourceList`. Find the position of `currentPos` in `shuffledSequence` (let it be `shuffledPos`).
- Increment `shuffledPos` by 1.
- If `shuffledPos >= length of shuffledSequence`:
  - If `repeatMode == All`: generate a **new** shuffled sequence that does *not* start with the last played track to avoid repeat bias. Set `shuffledPos = 0` after generation.
  - Else (`repeatMode == Off`): return `null` (stop).
- Else: the next track is the song at `sourceList[ shuffledSequence[shuffledPos] ]`.

### 5.3 Shuffle Sequence Generation Algorithm
- Let N = number of songs in the active playlist.
- The goal: produce a random permutation of the array [0, 1, ..., N‑1] with the constraint that the first element must **not** be the index of the song that just finished, unless N==1.
- Use Fisher–Yates shuffle to generate the permutation. After generating, if the first element equals the forbidden index and N>1, swap it with a random other element (or just re‑shuffle until condition is met). This ensures no immediate repetition.
- The sequence is stored as `shuffledSequence` and exhausted before generating a new one.
- When `repeatMode` is `All` and a new permutation is needed, the forbidden start index is the last song that played in the *previous* permutation.

### 5.4 Shuffle Enable/Disable During Playback
- **Turning shuffle ON:**
  - Determine the current track’s index in the playlist.
  - Generate a fresh `shuffledSequence` with the forbidden start index = current track’s index (to prevent the current track from being next when shuffle sequence begins; more elegantly, we can place the current track at the start of the shuffled sequence and set `currentSequenceIndex` = 0, so playback continues from this track without interruption, but the order of the rest is random). **Decision**: set `shuffledSequence` such that the current track’s playlist index is at position 0. Then the next track after current will be the element at position 1, which is random and not identical to current (since we forbid duplicate). This ensures no abrupt skip; the user just notices that after the current track, the order changes.
- **Turning shuffle OFF:**
  - Find the current track’s index in the original playlist (linear order).
  - Set `currentSequenceIndex` to that index.
  - Discard `shuffledSequence`.
  - Playback continues linearly from that point.

### 5.5 Queue Interaction with History and Skip
- When a queued song finishes, it is **not** added to the regular history stack the same way? It should be recorded so that “Previous” can go back to the previously played track (whether queued or playlist). Simplest: always push the currently playing song onto history *before* starting a new one, regardless of source (queue or playlist). Then, when “Previous” is pressed, it pops the last song and resumes it. This works uniformly.
- However, if the user manually queues multiple tracks and then skips them, the history must correctly interleave queue and playlist history. Our implementation: history stack stores `(songId, position)` only; source doesn’t matter. So yes, uniform.

### 5.6 Repeat One
- When `repeatMode == One`, the end‑of‑track handler does not call the Queue Manager at all. It directly instructs the Playback Engine to reload the same `currentSongId` at position 0 and resume playing. History is **not** altered (the track is just repeated).

---

## 6. LYRICS LOGIC

### 6.1 Lyrics File Detection
- Already resolved during import: each `Song` has `lyricsPath` or null.

### 6.2 Lyrics Parsing
- When a track is loaded, the Lyrics Manager checks `lyricsPath`.
- If the file extension is `.lrc`, it’s parsed as a synchronised lyrics file:
  - Each line may have one or more timestamps in the format `[mm:ss.xx]` followed by text.
  - Multiple timestamps on one line mean the same lyric is displayed over multiple time ranges.
  - The parser extracts all `(timestamp_in_seconds, text)` pairs and merges consecutive identical texts.
  - Build a sorted list of `{startTime, text}`. The lyric at index i is active from `startTime[i]` to `startTime[i+1]` (or end of song).
- If the file is `.txt`, treat it as plain text: the entire content is one block without timestamps.
- Store parsed lyrics in memory as either:
  - `synced`: array of `{timestamp, text}`
  - `plain`: single string

### 6.3 Lyrics Synchronisation (Time‑based)
- As the playback position updates (e.g., every 100ms), the system finds the current lyric for the given position:
  - Binary search on the synced array to find the last item where `timestamp <= currentPosition`.
  - The corresponding text is the “active lyric”.
- If plain lyrics, there’s no active tracking; just display the full text.
- This logic runs regardless of UI; it simply updates a variable holding the current lyric string(s) and optionally the next upcoming lyric for a two‑line display.

---

## 7. BACKGROUND PLAYBACK & OS INTEGRATION

### 7.1 Background Process Model
- The Playback Engine runs on a thread that is detached from the UI window lifecycle.
- When the user closes the window (but not the app), the window is hidden, but the audio thread continues. A system tray icon is presented (optional but logical) to bring back the window.
- If the user explicitly quits the application, all state is persisted, playback stops, and the process exits.

### 7.2 OS Media Session (Windows SMTC)
- On startup, the app registers as a media session.
- It updates the system with: title, artist, album, thumbnail (using `thumbnailPath`), playback status, position, and enabled controls (Play, Pause, Next, Previous).
- Responds to system‑initiated commands:
  - **Play** → Engine.Play()
  - **Pause** → Engine.Pause()
  - **Next** → Queue Manager request next track
  - **Previous** → History‑based previous logic
- Media keys (hardware) are intercepted by the OS and forwarded; the app handles them via the same commands.

### 7.3 Thumbnail Provision to OS
- The system expects an image. The app reads the `thumbnailPath` file and passes the image data. If missing, a default placeholder is used.

---

## 8. CLASSIC MEDIA PLAYER CONTROL BEHAVIORS

All user‑triggered actions.

### 8.1 Play
- If state is Paused, resume.
- If state is Stopped and a track is loaded but position=0, play from beginning.
- If no track is loaded, do nothing (or if there’s a playlist, load first track and play).

### 8.2 Pause
- If state is Playing, pause and retain position.

### 8.3 Stop
- If Playing or Paused, halt playback, set position = 0, state → Stopped.

### 8.4 Next
- Invoke Queue Manager to get next song id.
- If id is returned:
  - Push current song (with current position) onto history stack.
  - Load and play the new track from 0.
- If null (no next), do nothing (or stop if currently playing? Actually, stop with a notification of end).

### 8.5 Previous
- If there is a history stack and it’s not empty:
  - Save the current track (if any) to a “forward history” or simply note: many players use a single stack and re‑push the current song when going back? To keep it simple: Use a single stack. When Next is pressed, push the current song. When Previous is pressed, if the current track has been playing for more than a configurable threshold (e.g., 3 seconds), restart the current track instead of going to previous. Else, pop the history and load that song, setting its position to the stored position (which could be 0 or where it was when interrupted). The popped item is not pushed back (that would be the “next” history). This mimics standard behaviour:
    - Threshold rule: if `position > 3 seconds`, seek to 0 and continue. No history pop.
    - Else (within first 3 seconds), pop from history; if history empty, do nothing or reload the same track but seek to start? Usually just go to previous track.
    - When popping history, the record contains the song id and the position where it left off. Play from that position (not 0). This allows resuming mid‑track.
  - Note: If the history record’s song is no longer available (file deleted), skip to next history item or stop.

### 8.6 Seek
- Change `position` to the requested value. Must be clamped between 0 and `duration`.
- If state was Playing, continue playing; if Paused, remain paused but show updated position.

### 8.7 Volume and Mute
- Volume is stored as a linear value 0.0–1.0 (or percentage). Changing it alters the audio gain.
- Mute sets output to zero while preserving the volume level. Un‑mute restores previous volume.
- When mute is on and volume is changed, automatically unmute and apply new volume.

### 8.8 Track Selection (Click a song in playlist)
- If a different song is clicked:
  - Push current song (with position) onto history.
  - Load new song, position = 0.
  - If state was Playing, auto‑play the new track. If Paused, load and stay paused with position 0. If Stopped, load and remain stopped.

### 8.9 Add to Queue
- User can append one or multiple songs to the queue.
- The queue items are added at the end.
- If playback is currently stopped/idle and queue was empty, adding to queue does not auto‑start; user must press Play.

### 8.10 Repeat Mode Cycling
- Order: Off → All → One → Off …
- When switching to One: if a track is playing, nothing changes until it ends.
- When switching from One to All or Off: the current track continues; the next track will follow the new rule.

---

## 9. PERSISTENCE LOGIC

### 9.1 Data to Save (on app exit or periodically)
- Library: all `Song` objects (id, filePath, title, artist, album, duration, thumbnailPath, lyricsPath, format).
- Playlists: each playlist’s id, name, ordered song ids.
- The active playlist id.
- Playback state: `currentSongId`, `position`, `playbackStatus`, `volume`, `muted`, `shuffleEnabled`, `repeatMode`.
- Queue contents (ordered song ids).
- History stack (serialisable list of {songId, position}).
- Shuffle sequence and current index if shuffle is on (to survive restart).

### 9.2 Storage Format
- JSON file or SQLite database.
- For simplicity and human readability, JSON is fine. A single file `state.json` in the app’s data directory.
- On startup, read and reconstruct objects. Validate file existence of songs (mark missing).

### 9.3 Autosave
- Save state automatically at every significant change (track change, pause, queue update, volume), but throttle to once per second to avoid I/O overhead.

---

## 10. ERROR HANDLING & EDGE CASES

- **File not found when loading a track**: mark song as unavailable, show error, and automatically skip to next track as if track ended (calls Queue Manager).
- **Corrupted audio file**: catch decode error, skip to next track.
- **Missing thumbnail or lyrics**: handle gracefully by providing empty data; no crash.
- **Empty playlist**: disable Play/Next controls; display appropriate status.
- **All tracks unavailable**: playback stops; notify user.
- **Concurrency**: All state mutations that can be triggered from UI, media keys, or end‑of‑track must be serialised (e.g., using a message queue or mutex) to avoid race conditions.
- **Seek near end of track**: if seek to a position very close to duration, the next buffer fill will naturally trigger end‑of‑track and advance.
- **Rapid Next/Previous**: debounce or queue commands to avoid state corruption.

---

## 11. RESOURCE & PERFORMANCE LOGIC

- **Memory**: Only the currently playing track’s decoded audio buffer is held in memory (pipeline uses streaming). Album art thumbnails are loaded on demand and cached with an LRU cache (max 50 images) to avoid bloat.
- **CPU**: Decoding is off‑loaded to a low‑priority thread when not in real‑time playback; during playback, it gets higher priority.
- **Disk I/O**: Thumbnail reads are asynchronous; lyrics files are read once when track loads and cached.
- **Battery (laptop)**: The audio thread should release audio device when stopped to avoid holding a wakelock unnecessarily


### TeschStack recommendation
| Layer            | Recommendation              |
| ---------------- | --------------------------- |
| Language         | Rust                        |
| Desktop          | Tauri v2                    |
| Frontend         | SolidJS                     |
| Styling          | Tailwind CSS                |
| Components       | shadcn/ui (Solid port)      |
| Animations       | Motion One                  |
| Icons            | Lucide                      |
| Audio            | rodio + symphonia + cpal    |
| Metadata         | lofty                       |
| Database         | SQLite                      |
| Folder Watcher   | notify                      |
| Serialization    | serde                       |
| Image Processing | image crate                 |
| State Management | Nanostores or Solid Signals |
| Build Tool       | Vite                        |

