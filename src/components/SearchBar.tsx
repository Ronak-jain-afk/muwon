import { Search, X } from "lucide-solid";
import { searchQuery, setSearchQuery } from "../stores/library";
import { Show } from "solid-js";

export default function SearchBar() {
  function handleClear() {
    setSearchQuery("");
  }

  return (
    <div class="relative flex items-center">
      <Search class="absolute left-3 w-4 h-4 text-ink-disabled pointer-events-none" />
      <input
        type="text"
        value={searchQuery()}
        onInput={(e) => setSearchQuery(e.currentTarget.value)}
        placeholder="Search songs, artists, albums"
        class="w-full bg-transparent border border-border rounded-md pl-9 pr-8 py-2 text-sm text-ink placeholder:text-ink-disabled focus:outline-none focus:border-ink-secondary transition-colors duration-150"
      />
      <Show when={searchQuery()}>
        <button onClick={handleClear} class="absolute right-2 button-icon !p-1" aria-label="Clear search">
          <X class="w-3.5 h-3.5" />
        </button>
      </Show>
    </div>
  );
}
