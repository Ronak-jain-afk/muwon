import { createStore } from "solid-js/store";

interface UiState {
  sidebarOpen: boolean;
  showLyrics: boolean;
  showQueue: boolean;
}

const [ui, setUi] = createStore<UiState>({
  sidebarOpen: true,
  showLyrics: false,
  showQueue: false,
});

function toggleSidebar() {
  setUi("sidebarOpen", (v) => !v);
}

function toggleLyrics() {
  setUi("showLyrics", (v) => !v);
}

function toggleQueue() {
  setUi("showQueue", (v) => !v);
}

export { ui, setUi, toggleSidebar, toggleLyrics, toggleQueue };
