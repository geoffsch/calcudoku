// Persistence via localStorage: an in-progress game survives closing the app,
// and new-game settings (size/difficulty) are remembered.
//
// Every payload carries a schema version; loads reject any payload whose
// version or shape doesn't match, so stale saves from older app versions are
// discarded cleanly instead of crashing the UI.
//
// All localStorage access is wrapped: quota errors and privacy modes must
// degrade to "no persistence", never break the game.

const SAVE_KEY = "calcudoku.save";
const SETTINGS_KEY = "calcudoku.settings";
const SCHEMA = 1;

// game: { puzzle, values, marks, mode, solved }
export function saveGame(game) {
  write(SAVE_KEY, {
    schema: SCHEMA,
    savedAt: Date.now(),
    puzzle: game.puzzle,
    values: game.values,
    marks: game.marks,
    mode: game.mode,
    solved: game.solved,
  });
}

// Returns { puzzle, values, marks, mode, solved } or null if nothing usable.
export function loadGame() {
  const data = read(SAVE_KEY);
  if (!data || data.schema !== SCHEMA) return null;
  if (!isValidSave(data)) return null;
  return {
    puzzle: data.puzzle,
    values: data.values,
    marks: data.marks,
    mode: data.mode === "pencil" ? "pencil" : "pen",
    solved: data.solved === true,
  };
}

export function clearSavedGame() {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    // ignore
  }
}

export function saveSettings(settings) {
  write(SETTINGS_KEY, { schema: SCHEMA, ...settings });
}

// Returns { size, difficulty } or null.
export function loadSettings() {
  const data = read(SETTINGS_KEY);
  if (!data || data.schema !== SCHEMA) return null;
  const { size, difficulty } = data;
  if (!Number.isInteger(size) || typeof difficulty !== "string") return null;
  return { size, difficulty };
}

// ---------------------------------------------------------------------------

// Cheap structural validation — enough to guarantee the UI won't blow up on a
// tampered or truncated payload. Game-rule validity isn't rechecked here.
function isValidSave(data) {
  const p = data.puzzle;
  if (!p || !Number.isInteger(p.size) || p.size < 2 || p.size > 16) return false;
  if (!Array.isArray(p.cages) || p.cages.length === 0) return false;
  for (const cage of p.cages) {
    if (!Array.isArray(cage.cells) || cage.cells.length === 0) return false;
    if (typeof cage.op !== "string" || !Number.isFinite(cage.target)) return false;
  }
  if (!isGrid(p.solution, p.size) || !isGrid(data.values, p.size) || !isGrid(data.marks, p.size)) {
    return false;
  }
  return true;
}

function isGrid(grid, n) {
  return (
    Array.isArray(grid) &&
    grid.length === n &&
    grid.every((row) => Array.isArray(row) && row.length === n && row.every(Number.isInteger))
  );
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or unavailable — play on without persistence.
  }
}

function read(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
