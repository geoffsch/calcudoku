import { test } from "node:test";
import assert from "node:assert/strict";

import { createPlayerState, isComplete, isSolved, toggleMark, hasMark } from "../src/game/board.js";
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
