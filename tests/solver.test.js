import { test } from "node:test";
import assert from "node:assert/strict";

import { findSolutions, countSolutions } from "../src/game/solver.js";
import { randomPartition, assignOps, satisfies } from "../src/game/cages.js";
import { randomLatinSquare, isLatinSquare } from "../src/game/latin.js";
import { mulberry32 } from "../src/game/rng.js";

// Dumb reference implementation: enumerate every Latin square of size n and
// count the ones satisfying all cages. Only viable for small n.
function bruteForceSolutions(puzzle) {
  const n = puzzle.size;
  const grid = Array.from({ length: n }, () => new Array(n).fill(0));
  const found = [];

  function fill(idx) {
    if (idx === n * n) {
      const ok = puzzle.cages.every((cage) =>
        satisfies(cage, cage.cells.map(([r, c]) => grid[r][c]))
      );
      if (ok) found.push(grid.map((row) => row.slice()));
      return;
    }
    const r = Math.floor(idx / n);
    const c = idx % n;
    for (let v = 1; v <= n; v++) {
      let clash = false;
      for (let i = 0; i < n && !clash; i++) {
        if (grid[r][i] === v || grid[i][c] === v) clash = true;
      }
      if (clash) continue;
      grid[r][c] = v;
      fill(idx + 1);
      grid[r][c] = 0;
    }
  }

  fill(0);
  return found;
}

test("solver agrees with brute force on random small puzzles", () => {
  for (let n = 3; n <= 4; n++) {
    for (let seed = 1; seed <= 15; seed++) {
      const rng = mulberry32(n * 100 + seed);
      const solution = randomLatinSquare(n, rng);
      const cages = assignOps(
        randomPartition(n, { 1: 1, 2: 4, 3: 3 }, rng),
        solution,
        { pair: { "+": 1, "-": 1, "*": 1, "/": 1 }, multi: { "+": 1, "*": 1 } },
        rng
      );
      const puzzle = { size: n, cages };
      const expected = bruteForceSolutions(puzzle);
      const got = findSolutions(puzzle, Infinity);
      assert.equal(got.length, expected.length, `size ${n} seed ${seed}: solution count`);
      // Same set of solutions, order-independent.
      const key = (g) => g.flat().join("");
      assert.deepEqual(got.map(key).sort(), expected.map(key).sort());
    }
  }
});

test("solver finds the constructed solution among its results", () => {
  for (let n = 4; n <= 7; n++) {
    const rng = mulberry32(n);
    const solution = randomLatinSquare(n, rng);
    const cages = assignOps(
      randomPartition(n, { 2: 4, 3: 3, 4: 1 }, rng),
      solution,
      { pair: { "+": 1, "-": 1, "*": 1, "/": 1 }, multi: { "+": 1, "*": 1 } },
      rng
    );
    const found = findSolutions({ size: n, cages }, 50);
    assert.ok(found.length >= 1);
    const key = (g) => g.flat().join(",");
    assert.ok(
      found.map(key).includes(key(solution)),
      `size ${n}: original solution among the ${found.length} found`
    );
    for (const sol of found) {
      assert.ok(isLatinSquare(sol), "every solution is a Latin square");
    }
  }
});

test("countSolutions detects ambiguity (2x2 all-plus cage has 2 solutions)", () => {
  const puzzle = {
    size: 2,
    cages: [{ cells: [[0, 0], [0, 1], [1, 0], [1, 1]], op: "+", target: 6 }],
  };
  assert.equal(countSolutions(puzzle, 5), 2);
});

test("countSolutions respects the early-exit limit", () => {
  const puzzle = {
    size: 2,
    cages: [{ cells: [[0, 0], [0, 1], [1, 0], [1, 1]], op: "+", target: 6 }],
  };
  assert.equal(countSolutions(puzzle, 1), 1);
});

test("a given pins the ambiguous 2x2 down to one solution", () => {
  const puzzle = {
    size: 2,
    cages: [
      { cells: [[0, 0]], op: "=", target: 1 },
      { cells: [[0, 1], [1, 0], [1, 1]], op: "+", target: 5 },
    ],
  };
  const found = findSolutions(puzzle, 5);
  assert.equal(found.length, 1);
  assert.deepEqual(found[0], [[1, 2], [2, 1]]);
});

test("handles cages with more cells than the grid size (regression)", () => {
  // A 5-cell cage in a 3x3 grid once overflowed the solver's product-bound
  // table, wrongly yielding zero solutions.
  const puzzle = {
    size: 3,
    cages: [
      { cells: [[0, 2], [1, 1], [1, 2], [2, 1], [2, 2]], op: "*", target: 12 },
      { cells: [[0, 0], [0, 1], [1, 0], [2, 0]], op: "*", target: 18 },
    ],
  };
  const found = findSolutions(puzzle, 10);
  assert.ok(found.length >= 1, "must find the constructing solution");
  const key = (g) => g.flat().join("");
  assert.ok(found.map(key).includes("132321213"));
  assert.deepEqual(found.map(key).sort(), bruteForceSolutions(puzzle).map(key).sort());
});

test("an unsatisfiable puzzle has zero solutions", () => {
  const puzzle = {
    size: 2,
    cages: [
      { cells: [[0, 0]], op: "=", target: 1 },
      { cells: [[0, 1], [1, 0], [1, 1]], op: "+", target: 99 },
    ],
  };
  assert.equal(countSolutions(puzzle), 0);
});
