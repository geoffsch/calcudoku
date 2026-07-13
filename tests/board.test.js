import { test } from "node:test";
import assert from "node:assert/strict";

import {
  createPlayerState,
  isComplete,
  isSolved,
  toggleMark,
  hasMark,
  applyMarks,
  applyValue,
  eraseCells,
} from "../src/game/board.js";
import { generatePuzzle } from "../src/game/generator.js";
import { mulberry32 } from "../src/game/rng.js";

test("createPlayerState starts empty", () => {
  const state = createPlayerState(4);
  assert.equal(state.values.length, 4);
  assert.ok(state.values.every((row) => row.every((v) => v === 0)));
  assert.ok(state.marks.every((row) => row.every((m) => m === 0)));
  assert.equal(isComplete(state.values), false);
});

test("isSolved accepts the real solution and rejects near-misses", () => {
  const puzzle = generatePuzzle({ size: 5, difficulty: "medium", rng: mulberry32(99) });
  const values = puzzle.solution.map((row) => row.slice());
  assert.equal(isSolved(puzzle, values), true);

  // Swap two values in one row: still complete, no longer a solution.
  [values[0][0], values[0][1]] = [values[0][1], values[0][0]];
  assert.equal(isComplete(values), true);
  assert.equal(isSolved(puzzle, values), false);
});

test("isSolved rejects incomplete grids", () => {
  const puzzle = generatePuzzle({ size: 4, difficulty: "easy", rng: mulberry32(7) });
  const values = puzzle.solution.map((row) => row.slice());
  values[2][2] = 0;
  assert.equal(isSolved(puzzle, values), false);
});

test("pencil marks toggle as bitmasks", () => {
  const { marks } = createPlayerState(4);
  assert.equal(hasMark(marks, 1, 2, 3), false);
  toggleMark(marks, 1, 2, 3);
  assert.equal(hasMark(marks, 1, 2, 3), true);
  toggleMark(marks, 1, 2, 4);
  assert.equal(hasMark(marks, 1, 2, 4), true);
  assert.equal(hasMark(marks, 1, 2, 3), true);
  toggleMark(marks, 1, 2, 3);
  assert.equal(hasMark(marks, 1, 2, 3), false);
  assert.equal(hasMark(marks, 1, 2, 4), true);
});

test("applyMarks toggles the mark on each cell independently", () => {
  const { values, marks } = createPlayerState(4);
  const cells = [[0, 0], [0, 1], [0, 2]];

  applyMarks(marks, values, cells, 3);
  assert.ok(cells.every(([r, c]) => hasMark(marks, r, c, 3)));

  // Mixed state: only one cell has mark 3 → toggling flips each independently,
  // leaving them in opposite states ("replay the tap on each cell").
  toggleMark(marks, 0, 1, 3); // clear it on the middle cell
  applyMarks(marks, values, cells, 3);
  assert.equal(hasMark(marks, 0, 0, 3), false);
  assert.equal(hasMark(marks, 0, 1, 3), true);
  assert.equal(hasMark(marks, 0, 2, 3), false);
});

test("applyMarks skips cells that hold a committed value", () => {
  const { values, marks } = createPlayerState(4);
  values[0][1] = 2;
  applyMarks(marks, values, [[0, 0], [0, 1], [0, 2]], 3);
  assert.equal(hasMark(marks, 0, 0, 3), true);
  assert.equal(marks[0][1], 0); // untouched — it's filled
  assert.equal(hasMark(marks, 0, 2, 3), true);
});

test("applyValue sets each cell and toggles off when already equal", () => {
  const { values, marks } = createPlayerState(4);
  const cells = [[0, 0], [1, 1]];
  applyValue(values, marks, cells, 3, 4);
  assert.equal(values[0][0], 3);
  assert.equal(values[1][1], 3);

  applyValue(values, marks, cells, 3, 4); // same digit clears
  assert.equal(values[0][0], 0);
  assert.equal(values[1][1], 0);
});

test("applyValue replaces a different value rather than clearing", () => {
  const { values, marks } = createPlayerState(4);
  values[0][0] = 2;
  applyValue(values, marks, [[0, 0]], 3, 4);
  assert.equal(values[0][0], 3);
});

test("applyValue scrubs the committed digit from row/column marks of every cell", () => {
  const { values, marks } = createPlayerState(4);
  // Pencil 3 across the whole grid.
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) toggleMark(marks, r, c, 3);

  // Commit 3 to two cells in different rows/columns.
  applyValue(values, marks, [[0, 0], [1, 2]], 3, 4);

  // Their rows and columns lose mark 3...
  for (let i = 0; i < 4; i++) {
    assert.equal(hasMark(marks, 0, i, 3), false, `row 0 col ${i}`);
    assert.equal(hasMark(marks, i, 0, 3), false, `col 0 row ${i}`);
    assert.equal(hasMark(marks, 1, i, 3), false, `row 1 col ${i}`);
    assert.equal(hasMark(marks, i, 2, 3), false, `col 2 row ${i}`);
  }
  // ...but an untouched cell (row 2, col 1) keeps its mark.
  assert.equal(hasMark(marks, 2, 1, 3), true);
});

test("eraseCells clears value and marks on every selected cell", () => {
  const { values, marks } = createPlayerState(4);
  values[0][0] = 2;
  toggleMark(marks, 0, 1, 3);
  toggleMark(marks, 0, 1, 4);
  eraseCells(values, marks, [[0, 0], [0, 1]]);
  assert.equal(values[0][0], 0);
  assert.equal(marks[0][1], 0);
});
