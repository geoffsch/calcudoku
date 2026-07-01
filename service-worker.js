// Service worker: makes the app installable and fully usable offline.
//
// Strategy: pre-cache the complete app shell on install, then serve
// cache-first (an offline puzzle game has no dynamic content — the network
// is only a fallback for anything unexpected). Old caches are deleted on
// activate.
//
// IMPORTANT: bump CACHE_VERSION whenever any shipped file changes, otherwise
// installed clients keep the old cached copy. And keep APP_SHELL in sync with
// the actual file list — with native ES modules every src/**/*.js file is
// fetched (and must be cached) individually.

const CACHE_VERSION = "calcudoku-v3";

const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./styles/main.css",
  "./src/main.js",
  "./src/game/board.js",
  "./src/game/cages.js",
  "./src/game/generator.js",
  "./src/game/latin.js",
  "./src/game/rng.js",
  "./src/game/solver.js",
  "./src/state/storage.js",
  "./src/ui/controls.js",
  "./src/ui/input.js",
  "./src/ui/render.js",
  "./assets/icons/icon.svg",
  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(request, { ignoreSearch: true }).then(
      (cached) =>
        cached ??
        fetch(request).then((response) => {
          // Runtime-cache anything the shell list missed, so a stale list
          // degrades to slower first load rather than a broken offline app.
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
          }
          return response;
        })
    )
  );
});
