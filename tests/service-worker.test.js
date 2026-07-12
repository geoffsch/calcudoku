// Guard against the classic PWA failure: a file is added (with native ES
// modules every src/**/*.js is fetched individually) but the service worker's
// pre-cache list isn't updated, so the app breaks only when offline. This
// test keeps APP_SHELL and the real file tree in lockstep.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function listFiles(dir) {
  return readdirSync(join(ROOT, dir), { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? listFiles(`${dir}/${entry.name}`) : [`${dir}/${entry.name}`]
  );
}

test("service worker pre-caches exactly the shipped app files", () => {
  const sw = readFileSync(join(ROOT, "service-worker.js"), "utf8");
  // Scope to the APP_SHELL array so other "./…" strings (e.g. the module
  // import of version.js) aren't mistaken for cached entries.
  const shell = sw.match(/APP_SHELL = \[([\s\S]*?)\]/)[1];
  const listed = [...shell.matchAll(/"\.\/([^"]*)"/g)].map((m) => m[1]).filter((p) => p !== "");

  const expected = [
    "index.html",
    "manifest.webmanifest",
    "styles/main.css",
    ...listFiles("src").map((p) => p.replace(/\\/g, "/")),
    ...listFiles("assets").map((p) => p.replace(/\\/g, "/")),
  ];

  assert.deepEqual(listed.sort(), expected.sort());
});

test("cache name is derived from APP_VERSION so a version bump busts the cache", () => {
  // The cache name is built from APP_VERSION (src/version.js), so bumping the
  // app version automatically changes it — no separate cache-version edit
  // needed. Pin that wiring so a future edit can't silently hardcode it back.
  const sw = readFileSync(join(ROOT, "service-worker.js"), "utf8");
  assert.match(sw, /import \{ APP_VERSION \} from "\.\/src\/version\.js"/);
  assert.match(sw, /const CACHE_VERSION = `calcudoku-v\$\{APP_VERSION\}`/);
});
