// App entry point. Bootstraps the UI and registers the service worker.
//
// Nothing is implemented yet — see PLAN.md for the build order. This file's job
// is to wire the game engine (src/game) to the UI (src/ui) and persistence
// (src/state), then kick off the first render.

// import { newGame } from "./game/index.js";
// import { mountUI } from "./ui/render.js";
// import { loadState } from "./state/storage.js";

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("service-worker.js").catch((err) => {
      console.warn("Service worker registration failed:", err);
    });
  });
}

function init() {
  registerServiceWorker();
  // TODO: load saved state (or generate a new puzzle), then mount the UI.
  document.getElementById("app").textContent = "Calcudoku — skeleton. Nothing built yet.";
}

init();
