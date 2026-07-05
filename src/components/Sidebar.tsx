import { For, Show, createSignal } from "solid-js";
import { Library, ListMusic, FolderOpen, Plus, ChevronLeft, ChevronRight, Trash2 } from "lucide-solid";
import { playlists, activePlaylistId, setActivePlaylistId } from "../stores/library";
import { toggleSidebar } from "../stores/ui";
import { ui } from "../stores/ui";
import PlaylistDialog from "./PlaylistDialog";
import * as cmd from "../lib/commands";
import { setPlaylists } from "../stores/library";

interface SidebarProps {
  onImport: () => void;
}

export default function Sidebar(props: SidebarProps) {
  const [showDialog, setShowDialog] = createSignal(false);

  function handleSelectPlaylist(id: string) {
    setActivePlaylistId(id);
  }

  async function handleDeletePlaylist(id: string, name: string) {
    if (!confirm(`Delete "${name}"?`)) return;
    try {
      await cmd.deletePlaylist(id);
      setPlaylists(await cmd.getPlaylists());
    } catch {}
  }

  return (
    <div
      class="flex flex-col bg-surface border-r border-border transition-all duration-200 ease-out-expo overflow-hidden"
      classList={{ "w-sidebar": ui.sidebarOpen, "w-sidebar-collapsed": !ui.sidebarOpen }}
    >
      <div class="flex items-center justify-end px-2 h-10">
        <button onClick={toggleSidebar} class="button-icon" aria-label="Toggle sidebar">
          <Show when={ui.sidebarOpen} fallback={<ChevronRight class="w-4 h-4" />}>
            <ChevronLeft class="w-4 h-4" />
          </Show>
        </button>
      </div>

      <Show when={ui.sidebarOpen}>
        <nav class="flex flex-col gap-0.5 px-2">
          <button
            onClick={() => { const lib = playlists.find((p) => p.isLibrary); if (lib) handleSelectPlaylist(lib.id); }}
            class="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-ink-secondary hover:text-ink hover:bg-surface-hover transition-colors"
            classList={{ "!text-primary !bg-primary-glow": activePlaylistId() === playlists.find((p) => p.isLibrary)?.id }}
          >
            <Library class="w-4 h-4 shrink-0" />
            <span class="truncate">Library</span>
          </button>
        </nav>

        <div class="mx-3 my-2 h-px bg-border" />

        <div class="flex items-center justify-between px-3 py-1">
          <span class="text-xs font-medium text-ink-disabled uppercase tracking-wider">Playlists</span>
          <button onClick={() => setShowDialog(true)} class="button-icon !p-1" aria-label="Create playlist">
            <Plus class="w-3.5 h-3.5" />
          </button>
        </div>

        <div class="flex flex-col gap-0.5 px-2 flex-1 overflow-y-auto scrollbar-thin">
          <For each={playlists.filter((p) => !p.isLibrary)}>
            {(pl) => (
              <div class="group flex items-center rounded-md hover:bg-surface-hover/30 transition-colors">
                <button
                  onClick={() => handleSelectPlaylist(pl.id)}
                  class="flex items-center gap-3 flex-1 min-w-0 px-3 py-2 text-sm text-ink-secondary hover:text-ink transition-colors"
                  classList={{ "!text-primary": activePlaylistId() === pl.id }}
                >
                  <ListMusic class="w-4 h-4 shrink-0" />
                  <span class="truncate">{pl.name}</span>
                </button>
                <button
                  onClick={() => handleDeletePlaylist(pl.id, pl.name)}
                  class="opacity-0 group-hover:opacity-100 button-icon !p-1.5 mr-1 transition-opacity"
                  aria-label={`Delete ${pl.name}`}
                >
                  <Trash2 class="w-3 h-3" />
                </button>
              </div>
            )}
          </For>
        </div>

        <div class="px-2 pb-3 mt-auto">
          <button onClick={props.onImport} class="flex items-center gap-3 w-full rounded-md px-3 py-2 text-sm text-ink-secondary hover:text-ink hover:bg-surface-hover transition-colors">
            <FolderOpen class="w-4 h-4 shrink-0" />
            <span>Import folder</span>
          </button>
        </div>
      </Show>

      <PlaylistDialog open={showDialog()} onClose={() => setShowDialog(false)} />
    </div>
  );
}
