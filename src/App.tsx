import { createSignal, onMount, onCleanup } from "solid-js";
import { listen } from "@tauri-apps/api/event";
import { open } from "@tauri-apps/plugin-dialog";
import TitleBar from "./components/TitleBar";
import Sidebar from "./components/Sidebar";
import ContentArea from "./components/ContentArea";
import PlayerBar from "./components/PlayerBar";
import LyricsPane from "./components/LyricsPane";
import QueuePanel from "./components/QueuePanel";
import ContextMenu from "./components/ContextMenu";
import KeyboardShortcuts from "./components/KeyboardShortcuts";
import { playerState, setPlayerState, shuffleEnabled, setShuffleEnabled, repeatMode, setRepeatMode } from "./stores/player";
import { setSongs, setPlaylists, setActivePlaylistId } from "./stores/library";
import { refreshQueue } from "./stores/queue";
import type { Song } from "./lib/types";
import * as cmd from "./lib/commands";

interface CtxMenu {
  x: number;
  y: number;
  song: Song;
}

export default function App() {
  const [ctxMenu, setCtxMenu] = createSignal<CtxMenu | null>(null);

  onMount(async () => {
    try {
      const songs = await cmd.getAllSongs();
      const map: Record<string, Song> = {};
      for (const s of songs) map[s.id] = s;
      setSongs(map);

      const playlists = await cmd.getPlaylists();
      setPlaylists(playlists);
      const lib = playlists.find((p) => p.isLibrary);
      if (lib) setActivePlaylistId(lib.id);

      const s = await cmd.getState();
      setPlayerState({ volume: s.volume, muted: s.muted, status: s.playbackStatus as "playing" | "paused" | "stopped" });
      setShuffleEnabled(s.shuffleEnabled);
      setRepeatMode(s.repeatMode as "off" | "one" | "all");
    } catch (e) { console.error("Failed to load library:", e); }

    const unsubs = await Promise.all([
      listen<number>("position-update", (e) => setPlayerState("position", e.payload)),
      listen<number>("duration", (e) => setPlayerState("duration", e.payload)),
      listen<string>("state-changed", (e) => setPlayerState("status", e.payload as "playing" | "paused" | "stopped")),
    ]);
    onCleanup(() => unsubs.forEach((u) => u()));
  });

  async function handleImport() {
    try {
      const dir = await open({ directory: true, multiple: false, title: "Import music folder" });
      if (!dir) return;
      const added = await cmd.importFolder(dir);
      for (const s of added) setSongs(s.id, s);
      setPlaylists(await cmd.getPlaylists());
    } catch (e) { console.error("Import failed:", e); }
  }

  async function handlePlaySong(song: Song) {
    setPlayerState("currentSong", song);
    setPlayerState("duration", song.duration);
    setPlayerState("position", 0);
    try { await cmd.loadAndPlay(song.id); } catch { setPlayerState("status", "playing"); }

  }

  async function handlePlayPause() {
    try {
      const status = await cmd.togglePlay();
      setPlayerState("status", status);
    } catch {
      setPlayerState("status", playerState.status === "playing" ? "paused" : "playing");
    }
  }

  async function handleNext() {
    try {
      const nextId = await cmd.nextTrack();
      await refreshQueue();
      if (nextId) {
        const songs = await cmd.getAllSongs();
        const next = songs.find((s) => s.id === nextId);
        if (next) handlePlaySong(next);
      }
    } catch {}
  }

  async function handlePrev() {
    try {
      const prevId = await cmd.prevTrack();
      if (prevId) {
        const songs = await cmd.getAllSongs();
        const prev = songs.find((s) => s.id === prevId);
        if (prev) handlePlaySong(prev);
      } else {
        await cmd.seek(0);
        setPlayerState("position", 0);
      }
    } catch {}
  }

  async function handleSeek(value: number) {
    try { await cmd.seek(value); } catch {}
    setPlayerState("position", value);
  }

  async function handleVolumeChange(volume: number) {
    try { await cmd.setVolume(volume); } catch {}
    setPlayerState("volume", volume);
  }

  async function handleToggleMute() {
    try { setPlayerState("muted", await cmd.toggleMute()); } catch { setPlayerState("muted", !playerState.muted); }
  }

  function handleVolumeUp() { handleVolumeChange(Math.min(1, playerState.volume + 0.05)); }
  function handleVolumeDown() { handleVolumeChange(Math.max(0, playerState.volume - 0.05)); }

  function handleCycleRepeat() {
    const order = ["off", "all", "one"] as const;
    const idx = order.indexOf(repeatMode());
    const next = order[(idx + 1) % order.length];
    setRepeatMode(next);
    cmd.setRepeat(next).catch(() => {});
  }

  function handleToggleShuffle() {
    const next = !shuffleEnabled();
    setShuffleEnabled(next);
    cmd.setShuffle(next).catch(() => {});
  }

  function handleFocusSearch() {
    document.querySelector<HTMLInputElement>('input[type="text"]')?.focus();
  }

  async function handleAddToQueue(song: Song) {
    try { await cmd.addToQueue([song.id]); await refreshQueue(); } catch {}
  }

  function handleContextMenu(e: MouseEvent, song: Song) {
    e.preventDefault();
    setCtxMenu({ x: e.clientX, y: e.clientY, song });
  }

  return (
    <div class="h-screen flex flex-col bg-bg">
      <title>muwon</title>
      <KeyboardShortcuts
        onPlayPause={handlePlayPause}
        onNext={handleNext}
        onPrev={handlePrev}
        onToggleMute={handleToggleMute}
        onVolumeUp={handleVolumeUp}
        onVolumeDown={handleVolumeDown}
        onCycleRepeat={handleCycleRepeat}
        onToggleShuffle={handleToggleShuffle}
        onFocusSearch={handleFocusSearch}
      />
      <ContextMenu
        x={ctxMenu()?.x ?? 0}
        y={ctxMenu()?.y ?? 0}
        song={ctxMenu()?.song ?? null}
        onClose={() => setCtxMenu(null)}
        onPlay={handlePlaySong}
        onAddToQueue={handleAddToQueue}
      />
      <TitleBar />
      <div class="flex flex-1 min-h-0">
        <Sidebar onImport={handleImport} />
        <ContentArea onPlaySong={handlePlaySong} onContextMenu={handleContextMenu} />
        <LyricsPane />
        <QueuePanel onPlay={handlePlaySong} />
      </div>
      <PlayerBar
        onPlayPause={handlePlayPause}
        onNext={handleNext}
        onPrev={handlePrev}
        onSeek={handleSeek}
        onVolumeChange={handleVolumeChange}
        onToggleMute={handleToggleMute}
        onToggleShuffle={handleToggleShuffle}
        onCycleRepeat={handleCycleRepeat}
      />
    </div>
  );
}
