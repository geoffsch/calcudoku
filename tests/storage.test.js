// storage.js runs in the browser, but it only touches the `localStorage`
// global — stub that and it tests fine in Node.

import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";

import {
  saveGame,
  loadGame,
  clearSavedGame,
  saveSettings,
  loadSettings,
} from "../src/state/storage.js";
import { generatePuzzle } from "../src/game/generator.js";
import { createPlayerState } from "../src/game/board.js";
import { mulberry32 } from "../src/game/rng.js";

// Minimal in-memory localStorage.
function fakeStorage() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
    _map: map,
  };
}

beforeEach(() => {
  globalThis.localStorage = fakeStorage();
});

function sampleGame() {
  const puzzle = generatePuzzle({ size: 4, difficulty: "easy", rng: mulberry32(5) });
  const { values, marks } = createPlayerState(4);
  values[0][0] = 3;
  marks[1][2] = (1 << 2) | (1 << 4);
  return { puzzle, values, marks, mode: "pencil", solved: false };
}

test("saveGame/loadGame round-trips", () => {
  const game = sampleGame();
  saveGame(game);
  const loaded = loadGame();
  assert.deepEqual(loaded.puzzle, game.puzzle);
  assert.deepEqual(loaded.values, game.values);
  assert.deepEqual(loaded.marks, game.marks);
  assert.equal(loaded.mode, "pencil");
  assert.equal(loaded.solved, false);
});

test("loadGame returns null when nothing is saved", () => {
  assert.equal(loadGame(), null);
});

test("clearSavedGame removes the save", () => {
  saveGame(sampleGame());
  clearSavedGame();
  assert.equal(loadGame(), null);
});

test("loadGame rejects wrong schema versions", () => {
  saveGame(sampleGame());
  const raw = JSON.parse(localStorage.getItem("calcudoku.save"));
  raw.schema = 999;
  localStorage.setItem("calcudoku.save", JSON.stringify(raw));
  assert.equal(loadGame(), null);
});

test("loadGame rejects corrupted payloads", () => {
  localStorage.setItem("calcudoku.save", "{not json");
  assert.equal(loadGame(), null);

  saveGame(sampleGame());
  const raw = JSON.parse(localStorage.getItem("calcudoku.save"));
  raw.values = [[1, 2], [3, 4]]; // wrong dimensions
  localStorage.setItem("calcudoku.save", JSON.stringify(raw));
  assert.equal(loadGame(), null);
});

test("storage failures degrade to no-ops instead of throwing", () => {
  globalThis.localStorage = {
    getItem: () => {
      throw new Error("denied");
    },
    setItem: () => {
      throw new Error("quota");
    },
    removeItem: () => {
      throw new Error("denied");
    },
  };
  assert.doesNotThrow(() => saveGame(sampleGame()));
  assert.equal(loadGame(), null);
  assert.doesNotThrow(() => clearSavedGame());
});

test("settings round-trip and validation", () => {
  assert.equal(loadSettings(), null);
  saveSettings({ size: 6, difficulty: "hard" });
  assert.deepEqual(loadSettings(), { size: 6, difficulty: "hard" });

  localStorage.setItem("calcudoku.settings", JSON.stringify({ schema: 1, size: "six" }));
  assert.equal(loadSettings(), null);
});
