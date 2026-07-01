// App entry point and controller: owns the game state, applies all mutations,
// and wires the engine (src/game) to the UI (src/ui) and persistence
// (src/state). Also registers the service worker for offline use.

import { generatePuzzle } from "./game/generator.js";
import { createPlayerState, isSolved, toggleMark } from "./game/board.js";
import { buildBoard, updateBoard, buildNumberPad } from "./ui/render.js";
import { buildChrome } from "./ui/controls.js";
import { attachBoardInput, attachKeyboardInput } from "./ui/input.js";
import {
  saveGame,
  loadGame,
  clearSavedGame,
  saveSettings,
  loadSettings,
} from "./state/storage.js";

const DEFAULT_SETTINGS = { size: 4, difficulty: "easy" };

const app = {
  puzzle: null,
  values: null,
  marks: null,
  selected: null,
  mode: "pen", // "pen" commits values, "pencil" toggles candidate marks
  undoStack: [],
  solved: false,
  cellEls: null,
  ui: null,
};

// ---------------------------------------------------------------------------
// Mutations. Every player action funnels through here: snapshot cells for
// undo, apply, persist, re-render.

function selectCell(r, c) {
  app.selected = [r, c];
  refresh();
}

function moveSelection(dr, dc) {
  const n = app.puzzle.size;
  const [r, c] = app.selected ?? [0, 0];
  selectCell(
    Math.min(n - 1, Math.max(0, r + dr)),
    Math.min(n - 1, Math.max(0, c + dc))
  );
}

function enterDigit(d) {
  if (app.solved || !app.selected) return;
  const [r, c] = app.selected;

  if (app.mode === "pencil") {
    if (app.values[r][c] !== 0) return; // no marks on committed cells
    pushUndo([[r, c]]);
    toggleMark(app.marks, r, c, d);
  } else {
    const n = app.puzzle.size;
    // Snapshot the whole row + column: committing a value auto-cleans that
    // candidate from peers' pencil marks, and undo must restore those too.
    const affected = [];
    for (let i = 0; i < n; i++) affected.push([r, i], [i, c]);
    pushUndo(affected);

    app.values[r][c] = app.values[r][c] === d ? 0 : d; // same digit toggles off
    if (app.values[r][c] !== 0) {
      const bit = 1 << d;
      for (let i = 0; i < n; i++) {
        app.marks[r][i] &= ~bit;
        app.marks[i][c] &= ~bit;
      }
    }
    checkSolved();
  }
  persist();
  refresh();
}

function erase() {
  if (app.solved || !app.selected) return;
  const [r, c] = app.selected;
  if (app.values[r][c] === 0 && app.marks[r][c] === 0) return;
  pushUndo([[r, c]]);
  app.values[r][c] = 0;
  app.marks[r][c] = 0;
  persist();
  refresh();
}

function undo() {
  if (app.solved) return;
  const snapshot = app.undoStack.pop();
  if (!snapshot) return;
  for (const { r, c, value, marks } of snapshot) {
    app.values[r][c] = value;
    app.marks[r][c] = marks;
  }
  persist();
  refresh();
}

function setMode(mode) {
  app.mode = mode;
  app.ui.setMode(mode);
  persist();
}

function pushUndo(cells) {
  // Dedupe (row+column snapshots overlap on the target cell).
  const seen = new Set();
  const snapshot = [];
  for (const [r, c] of cells) {
    const k = `${r},${c}`;
    if (seen.has(k)) continue;
    seen.add(k);
    snapshot.push({ r, c, value: app.values[r][c], marks: app.marks[r][c] });
  }
  app.undoStack.push(snapshot);
  if (app.undoStack.length > 500) app.undoStack.shift();
}

function checkSolved() {
  if (!isSolved(app.puzzle, app.values)) return;
  app.solved = true;
  app.selected = null;
  if (navigator.vibrate) navigator.vibrate([60, 40, 120]);
  showSolvedOverlay();
}

// ---------------------------------------------------------------------------
// Game lifecycle

function newGame(size, difficulty) {
  saveSettings({ size, difficulty });
  app.ui.setDialogDefaults(size, difficulty);
  app.ui.showOverlay(`<div class="overlay-card"><p>Generating ${size}×${size} ${difficulty}…</p></div>`);

  // Let the overlay paint before generation blocks the main thread (9×9 hard
  // can take a few seconds on a phone).
  setTimeout(() => {
    const puzzle = generatePuzzle({ size, difficulty });
    startGame({ puzzle, ...createPlayerState(size), mode: app.mode, solved: false });
  }, 50);
}

function startGame(game) {
  app.puzzle = game.puzzle;
  app.values = game.values;
  app.marks = game.marks;
  app.mode = game.mode;
  app.solved = game.solved;
  app.selected = null;
  app.undoStack = [];

  app.ui.hideOverlay();
  app.ui.setMode(app.mode);
  app.ui.setInfo(`${game.puzzle.size}×${game.puzzle.size} · ${game.puzzle.difficulty}`);
  app.cellEls = buildBoard(app.ui.board, app.puzzle);
  buildNumberPad(app.ui.digits, app.puzzle.size, enterDigit);
  refresh();
  persist();
  if (app.solved) showSolvedOverlay();
}

function showSolvedOverlay() {
  const overlay = app.ui.showOverlay(
    `<div class="overlay-card solved-card">
       <p class="solved-title">Solved! 🎉</p>
       <button type="button" class="btn btn-primary" id="btn-play-again">New game</button>
     </div>`
  );
  overlay.querySelector("#btn-play-again").addEventListener("click", () => {
    app.ui.openNewGameDialog();
  });
}

function refresh() {
  updateBoard(app.cellEls, app.puzzle, app);
}

function persist() {
  saveGame(app);
}

// ---------------------------------------------------------------------------
// Boot

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

  const root = document.getElementById("app");
  app.ui = buildChrome(root, {
    onNewGame: newGame,
    onMode: setMode,
    onErase: erase,
    onUndo: undo,
  });

  attachBoardInput(app.ui.board, { onSelect: selectCell });
  attachKeyboardInput({
    size: () => (app.puzzle ? app.puzzle.size : 0),
    onDigit: enterDigit,
    onErase: erase,
    onUndo: undo,
    onMove: moveSelection,
    onToggleMode: () => setMode(app.mode === "pen" ? "pencil" : "pen"),
  });

  const settings = loadSettings() ?? DEFAULT_SETTINGS;
  app.ui.setDialogDefaults(settings.size, settings.difficulty);

  const saved = loadGame();
  if (saved) {
    startGame(saved);
  } else {
    newGame(settings.size, settings.difficulty);
  }
}

init();
