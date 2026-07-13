// Board / player-state model.
//
// A Puzzle (from generator.js) is immutable once created:
//   { size, difficulty, cages: [{ cells, op, target }], solution }
//
// PlayerState is what the player edits, kept separate so a puzzle can be
// reset or checked without touching it:
//   {
//     values: number[n][n]   // committed entries, 0 = empty
//     marks:  number[n][n]   // pencil-mark candidates as a bitmask
//   }                        //   (bit v set = value v pencilled in)
//
// Bitmask marks keep toggling, rendering and JSON serialisation trivial.

import { isLatinSquare } from "./latin.js";
import { satisfies } from "./cages.js";

export function createPlayerState(size) {
  return {
    values: Array.from({ length: size }, () => new Array(size).fill(0)),
    marks: Array.from({ length: size }, () => new Array(size).fill(0)),
  };
}

export function isComplete(values) {
  return values.every((row) => row.every((v) => v > 0));
}

// The real win condition: the entered grid is a Latin square and every cage
// clue is met. Checked against the constraints (not the stored solution), so
// it is honest even if a puzzle somehow had another valid fill.
export function isSolved(puzzle, values) {
  if (!isComplete(values)) return false;
  if (!isLatinSquare(values)) return false;
  return puzzle.cages.every((cage) =>
    satisfies(cage, cage.cells.map(([r, c]) => values[r][c]))
  );
}

export function toggleMark(marks, r, c, v) {
  marks[r][c] ^= 1 << v;
}

export function hasMark(marks, r, c, v) {
  return (marks[r][c] & (1 << v)) !== 0;
}

// ---------------------------------------------------------------------------
// Multi-cell actions. Each applies the single-cell rule independently to every
// cell in `cells` (a list of [r, c]) — "replay the tap on each cell". A list of
// one reproduces the single-cell behaviour exactly. All mutate in place.

// Toggle pencil-mark v on each cell, skipping any that holds a committed value
// (you can't pencil-mark a filled cell).
export function applyMarks(marks, values, cells, v) {
  for (const [r, c] of cells) {
    if (values[r][c] !== 0) continue;
    toggleMark(marks, r, c, v);
  }
}

// Toggle committed value v on each cell (a cell already equal to v is cleared,
// otherwise set to v). Committing v scrubs it from that cell's row/column marks.
export function applyValue(values, marks, cells, v, n) {
  for (const [r, c] of cells) {
    values[r][c] = values[r][c] === v ? 0 : v;
    if (values[r][c] !== 0) {
      const bit = 1 << v;
      for (let i = 0; i < n; i++) {
        marks[r][i] &= ~bit;
        marks[i][c] &= ~bit;
      }
    }
  }
}

// Clear both value and pencil marks from each cell.
export function eraseCells(values, marks, cells) {
  for (const [r, c] of cells) {
    values[r][c] = 0;
    marks[r][c] = 0;
  }
}
