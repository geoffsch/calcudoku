import { test } from "node:test";
import assert from "node:assert/strict";

import { randomLatinSquare, isLatinSquare } from "../src/game/latin.js";
import { mulberry32 } from "../src/game/rng.js";

test("randomLatinSquare produces valid Latin squares for sizes 3-9", () => {
  for (let n = 3; n <= 9; n++) {
    for (let seed = 1; seed <= 5; seed++) {
      const grid = randomLatinSquare(n, mulberry32(n * 100 + seed));
      assert.ok(isLatinSquare(grid), `size ${n}, seed ${seed} should be Latin`);
    }
  }
});

test("randomLatinSquare is deterministic for a given seed", () => {
  const a = randomLatinSquare(6, mulberry32(42));
  const b = randomLatinSquare(6, mulberry32(42));
  assert.deepEqual(a, b);
});

test("different seeds give different squares (usually)", () => {
  const a = randomLatinSquare(6, mulberry32(1));
  const b = randomLatinSquare(6, mulberry32(2));
  assert.notDeepEqual(a, b);
});

test("isLatinSquare rejects invalid grids", () => {
  assert.equal(isLatinSquare([[1, 2], [1, 2]]), false); // repeated column values
  assert.equal(isLatinSquare([[1, 1], [2, 2]]), false); // repeated row values
  assert.equal(isLatinSquare([[1, 2], [2, 0]]), false); // out-of-range value
  assert.equal(isLatinSquare([[3, 2], [2, 3]]), false); // values not 1..n
  assert.equal(isLatinSquare([[1, 2], [2, 1]]), true);
});
