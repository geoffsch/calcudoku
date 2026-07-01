// Service worker: makes the app installable and usable offline.
//
// Strategy (to be implemented): cache-first for the app shell so the puzzle
// works with no network. Bump CACHE_VERSION whenever shipped files change,
// otherwise phones will keep serving the old cached copy.

const CACHE_VERSION = "calcudoku-v1";

const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./styles/main.css",
  "./src/main.js",
  // NOTE: with native ES modules each src/**/*.js is fetched separately.
  // List them here (or generate this list) so the whole app is cached offline.
];

// TODO: install -> pre-cache APP_SHELL
// TODO: activate -> delete old caches (anything !== CACHE_VERSION)
// TODO: fetch    -> cache-first, fall back to network

self.addEventListener("install", (event) => {
  // placeholder — see PLAN.md, offline phase
});

self.addEventListener("activate", (event) => {
  // placeholder
});

self.addEventListener("fetch", (event) => {
  // placeholder — currently passes through to network
});
