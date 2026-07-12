// The app version lives in src/version.js — the single source the UI and service
// worker read. package.json can't import it (JSON isn't executable, and nothing
// reads package.json at runtime), so this test keeps the mirror honest.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { APP_VERSION } from "../src/version.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

test("APP_VERSION matches package.json version", () => {
  const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
  assert.equal(APP_VERSION, pkg.version);
});
