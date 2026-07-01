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
