// App entry point and controller: owns the game state, applies all mutations,
// and wires the engine (src/game) to the UI (src/ui) and persistence
// (src/state). Also registers the service worker for offline use.

import { generatePuzzle } from "./game/generator.js";
import { createPlayerState, isSolved, applyMarks, applyValue, eraseCells } from "./game/board.js";
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
  selection: new Set(), // set of "r,c" keys — a tap toggles membership
  anchor: null, // [r, c] of the last-tapped cell; arrow keys move from here
  selectionSealed: false, // once an action is applied, the next tap starts fresh
  mode: "pen", // "pen" commits values, "pencil" toggles candidate marks
  undoStack: [],
  solved: false,
  cellEls: null,
  ui: null,
};

// ---------------------------------------------------------------------------
// Mutations. Every player action funnels through here: snapshot cells for
// undo, apply, persist, re-render.

// The current selection as a list of [r, c] pairs.
function selectionCells() {
  return [...app.selection].map((k) => k.split(",").map(Number));
}

function clearSelection() {
  app.selection.clear();
  app.anchor = null;
  app.selectionSealed = false;
}

// A tap toggles a cell in/out of the selection. "Seal-after-apply": once an
// action has been applied, the next tap starts a fresh selection instead of
// extending the old one — so filling cells one by one never accumulates, while
// a not-yet-applied selection keeps growing (tap a trio, then note 1/3/9).
function selectCell(r, c) {
  if (app.solved) return;
  if (app.selectionSealed) {
    app.selection.clear();
    app.selectionSealed = false;
  }
  const key = `${r},${c}`;
  if (app.selection.has(key)) app.selection.delete(key);
  else app.selection.add(key);
  app.anchor = [r, c];
  refresh();
}

// Arrow keys: collapse to a single cell and move the anchor (desktop nav).
function moveSelection(dr, dc) {
  const n = app.puzzle.size;
  const [r, c] = app.anchor ?? [0, 0];
  const nr = Math.min(n - 1, Math.max(0, r + dr));
  const nc = Math.min(n - 1, Math.max(0, c + dc));
  app.selection = new Set([`${nr},${nc}`]);
  app.anchor = [nr, nc];
  app.selectionSealed = false;
  refresh();
}

function enterDigit(d) {
  if (app.solved || app.selection.size === 0) return;
  const cells = selectionCells();

  if (app.mode === "pencil") {
    // applyMarks skips committed cells; snapshot only the ones it can change.
    const eligible = cells.filter(([r, c]) => app.values[r][c] === 0);
    if (eligible.length === 0) return;
    pushUndo(eligible);
    applyMarks(app.marks, app.values, eligible, d);
  } else {
    const n = app.puzzle.size;
    // Committing a value auto-cleans that candidate from peers' pencil marks, so
    // snapshot each selected cell's whole row + column; undo must restore those.
    const affected = [];
    for (const [r, c] of cells) {
      for (let i = 0; i < n; i++) affected.push([r, i], [i, c]);
    }
    pushUndo(affected);
    applyValue(app.values, app.marks, cells, d, n);
    checkSolved();
  }
  app.selectionSealed = true;
  persist();
  refresh();
}

function erase() {
  if (app.solved || app.selection.size === 0) return;
  const cells = selectionCells().filter(
    ([r, c]) => app.values[r][c] !== 0 || app.marks[r][c] !== 0
  );
  if (cells.length === 0) return;
  pushUndo(cells);
  eraseCells(app.values, app.marks, cells);
  app.selectionSealed = true;
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
  clearSelection(); // don't carry a selection across a mode change
  app.ui.setMode(mode);
  persist();
  refresh();
}

function clearSelectionAction() {
  if (app.selection.size === 0) return;
  clearSelection();
  refresh();
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
  clearSelection();
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
  clearSelection();
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
    // Module worker so the SW can import shared constants (APP_VERSION).
    navigator.serviceWorker.register("service-worker.js", { type: "module" }).catch((err) => {
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
    onClear: clearSelectionAction,
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
