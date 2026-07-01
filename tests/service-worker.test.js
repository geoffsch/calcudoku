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
  const listed = [...sw.matchAll(/"\.\/([^"]*)"/g)].map((m) => m[1]).filter((p) => p !== "");

  const expected = [
    "index.html",
    "manifest.webmanifest",
    "styles/main.css",
    ...listFiles("src").map((p) => p.replace(/\\/g, "/")),
    ...listFiles("assets").map((p) => p.replace(/\\/g, "/")),
  ];

  assert.deepEqual(listed.sort(), expected.sort());
});

test("cache version changes when shipped files change (manual reminder)", () => {
  // Not automatable without a build step — this just pins the format so a
  // future edit that deletes the version string outright fails a test.
  const sw = readFileSync(join(ROOT, "service-worker.js"), "utf8");
  assert.match(sw, /const CACHE_VERSION = "calcudoku-v\d+"/);
});
