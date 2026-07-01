// The most important property in the project: every generated puzzle has
// EXACTLY ONE solution, across sizes and difficulties.

import { test } from "node:test";
import assert from "node:assert/strict";

import { generatePuzzle, DIFFICULTIES } from "../src/game/generator.js";
import { findSolutions } from "../src/game/solver.js";
import { satisfies, isContiguous } from "../src/game/cages.js";
import { isLatinSquare } from "../src/game/latin.js";
import { mulberry32 } from "../src/game/rng.js";

function assertWellFormed(puzzle) {
  const n = puzzle.size;

  assert.ok(isLatinSquare(puzzle.solution), "solution is a Latin square");

  // Cages tile the grid exactly and are contiguous.
  const seen = new Set();
  for (const cage of puzzle.cages) {
    assert.ok(isContiguous(cage.cells), "cage is contiguous");
    for (const [r, c] of cage.cells) {
      const k = `${r},${c}`;
      assert.ok(!seen.has(k), "no cell in two cages");
      seen.add(k);
    }
    if (cage.op === "-" || cage.op === "/") assert.equal(cage.cells.length, 2);
    if (cage.op === "=") assert.equal(cage.cells.length, 1);
    // The advertised solution satisfies every clue.
    const vals = cage.cells.map(([r, c]) => puzzle.solution[r][c]);
    assert.ok(satisfies(cage, vals), `solution satisfies ${cage.op}${cage.target}`);
  }
  assert.equal(seen.size, n * n, "cages cover the whole grid");
}

function assertUnique(puzzle) {
  const found = findSolutions({ size: puzzle.size, cages: puzzle.cages }, 2);
  assert.equal(found.length, 1, "exactly one solution");
  assert.deepEqual(found[0], puzzle.solution, "and it is the advertised one");
}

test("generated puzzles are well-formed and unique (sizes 3-6, all difficulties)", () => {
  for (let size = 3; size <= 6; size++) {
    for (const difficulty of DIFFICULTIES) {
      for (let seed = 1; seed <= 3; seed++) {
        const rng = mulberry32(size * 1000 + seed);
        const puzzle = generatePuzzle({ size, difficulty, rng });
        assertWellFormed(puzzle);
        assertUnique(puzzle);
      }
    }
  }
});

test("generated puzzles are well-formed and unique (sizes 7-9)", () => {
  for (const [size, difficulty, seed] of [
    [7, "easy", 1],
    [7, "hard", 2],
    [8, "medium", 3],
    [9, "easy", 4],
    [9, "medium", 5],
    [9, "hard", 6],
  ]) {
    const puzzle = generatePuzzle({ size, difficulty, rng: mulberry32(seed) });
    assertWellFormed(puzzle);
    assertUnique(puzzle);
  }
});

test("9x9 hard generation completes in reasonable time", () => {
  const start = performance.now();
  for (let seed = 10; seed < 13; seed++) {
    generatePuzzle({ size: 9, difficulty: "hard", rng: mulberry32(seed) });
  }
  const elapsed = performance.now() - start;
  // Generous bound — this guards against pathological regressions, not perf drift.
  assert.ok(elapsed < 30_000, `3 puzzles took ${Math.round(elapsed)}ms`);
});

test("difficulty knobs have visible effect on givens", () => {
  const givens = (p) => p.cages.filter((c) => c.op === "=").length;
  let easyGivens = 0;
  let hardGivens = 0;
  for (let seed = 1; seed <= 8; seed++) {
    easyGivens += givens(generatePuzzle({ size: 6, difficulty: "easy", rng: mulberry32(seed) }));
    // Hard aims for zero givens but ambiguity-fixing splits can leave a few.
    const hard = generatePuzzle({ size: 6, difficulty: "hard", rng: mulberry32(seed) });
    assert.ok(givens(hard) <= 4, `hard puzzle has few givens (got ${givens(hard)})`);
    hardGivens += givens(hard);
  }
  assert.ok(easyGivens >= 8, "easy puzzles average at least one given");
  assert.ok(easyGivens > hardGivens * 1.5, `easy (${easyGivens}) clearly above hard (${hardGivens})`);
});

test("generatePuzzle validates its arguments", () => {
  assert.throws(() => generatePuzzle({ size: 2 }));
  assert.throws(() => generatePuzzle({ size: 10 }));
  assert.throws(() => generatePuzzle({ size: 5, difficulty: "nightmare" }));
});
