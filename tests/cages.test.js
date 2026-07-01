import { test } from "node:test";
import assert from "node:assert/strict";

import {
  randomPartition,
  mergeSingletons,
  splitCage,
  assignOps,
  satisfies,
  clueLabel,
  isContiguous,
  cageIndexOf,
} from "../src/game/cages.js";
import { randomLatinSquare } from "../src/game/latin.js";
import { mulberry32 } from "../src/game/rng.js";

const SIZE_WEIGHTS = { 1: 1, 2: 4, 3: 3, 4: 1 };
const OP_WEIGHTS = { pair: { "+": 1, "-": 1, "*": 1, "/": 1 }, multi: { "+": 1, "*": 1 } };

function partitionCoversGrid(cages, n) {
  const seen = new Set();
  for (const cage of cages) {
    for (const [r, c] of cage.cells) {
      const k = `${r},${c}`;
      if (seen.has(k)) return false;
      if (r < 0 || r >= n || c < 0 || c >= n) return false;
      seen.add(k);
    }
  }
  return seen.size === n * n;
}

test("randomPartition covers the grid exactly with contiguous cages", () => {
  for (let n = 3; n <= 9; n++) {
    for (let seed = 1; seed <= 5; seed++) {
      const cages = randomPartition(n, SIZE_WEIGHTS, mulberry32(n * 10 + seed));
      assert.ok(partitionCoversGrid(cages, n), `size ${n} seed ${seed}: exact cover`);
      for (const cage of cages) {
        assert.ok(isContiguous(cage.cells), `size ${n} seed ${seed}: contiguous`);
        assert.ok(cage.cells.length <= 4, "respects max cage size");
      }
    }
  }
});

test("mergeSingletons reduces givens and keeps a valid partition", () => {
  const n = 6;
  for (let seed = 1; seed <= 10; seed++) {
    const rng = mulberry32(seed);
    // All-singleton weighting guarantees plenty of givens to merge.
    let cages = randomPartition(n, { 1: 5, 2: 1 }, rng);
    const before = cages.filter((c) => c.cells.length === 1).length;
    cages = mergeSingletons(cages, n, 1, 4, rng);
    const after = cages.filter((c) => c.cells.length === 1).length;
    assert.ok(after <= before);
    assert.ok(after <= 3, `seed ${seed}: givens mostly merged away (got ${after})`);
    assert.ok(partitionCoversGrid(cages, n), "still an exact cover");
    for (const cage of cages) {
      assert.ok(isContiguous(cage.cells), "still contiguous");
      assert.ok(cage.cells.length <= 4, "respects max size");
    }
  }
});

test("splitCage yields two contiguous cages covering the original", () => {
  for (let seed = 1; seed <= 20; seed++) {
    const rng = mulberry32(seed);
    const cages = randomPartition(6, { 3: 1, 4: 1, 5: 1 }, rng);
    const cage = cages.find((c) => c.cells.length >= 2);
    const [a, b] = splitCage(cage, rng);
    assert.ok(a.cells.length >= 1 && b.cells.length >= 1);
    assert.equal(a.cells.length + b.cells.length, cage.cells.length);
    assert.ok(isContiguous(a.cells));
    assert.ok(isContiguous(b.cells));
    const all = new Set([...a.cells, ...b.cells].map(([r, c]) => `${r},${c}`));
    assert.equal(all.size, cage.cells.length);
  }
});

test("assignOps produces clues the solution satisfies", () => {
  for (let n = 3; n <= 9; n++) {
    for (let seed = 1; seed <= 5; seed++) {
      const rng = mulberry32(n * 1000 + seed);
      const solution = randomLatinSquare(n, rng);
      const cages = assignOps(randomPartition(n, SIZE_WEIGHTS, rng), solution, OP_WEIGHTS, rng);
      for (const cage of cages) {
        const vals = cage.cells.map(([r, c]) => solution[r][c]);
        assert.ok(satisfies(cage, vals), `${cage.op}${cage.target} on [${vals}]`);
        if (cage.op === "-" || cage.op === "/") {
          assert.equal(cage.cells.length, 2, "- and / are 2-cell only");
        }
        if (cage.op === "=") assert.equal(cage.cells.length, 1);
        if (cage.op === "/") assert.ok(Number.isInteger(cage.target), "division is exact");
      }
    }
  }
});

test("satisfies rejects wrong values", () => {
  assert.equal(satisfies({ op: "+", target: 7, cells: [[0, 0], [0, 1]] }, [3, 3]), false);
  assert.equal(satisfies({ op: "-", target: 2, cells: [[0, 0], [0, 1]] }, [5, 4]), false);
  assert.equal(satisfies({ op: "-", target: 2, cells: [[0, 0], [0, 1]] }, [3, 5]), true);
  assert.equal(satisfies({ op: "/", target: 2, cells: [[0, 0], [0, 1]] }, [3, 5]), false);
  assert.equal(satisfies({ op: "/", target: 2, cells: [[0, 0], [0, 1]] }, [6, 3]), true);
  assert.equal(satisfies({ op: "*", target: 12, cells: [[0, 0], [0, 1], [1, 1]] }, [2, 3, 2]), true);
  assert.equal(satisfies({ op: "=", target: 4, cells: [[0, 0]] }, [4]), true);
  assert.equal(satisfies({ op: "=", target: 4, cells: [[0, 0]] }, [3]), false);
});

test("clueLabel formats operations for display", () => {
  assert.equal(clueLabel({ op: "+", target: 12 }), "12+");
  assert.equal(clueLabel({ op: "-", target: 3 }), "3−");
  assert.equal(clueLabel({ op: "*", target: 24 }), "24×");
  assert.equal(clueLabel({ op: "/", target: 2 }), "2÷");
  assert.equal(clueLabel({ op: "=", target: 5 }), "5");
});

test("cageIndexOf maps every cell to its cage", () => {
  const rng = mulberry32(7);
  const cages = randomPartition(5, SIZE_WEIGHTS, rng);
  const index = cageIndexOf(cages, 5);
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      const i = index[r][c];
      assert.ok(cages[i].cells.some(([rr, cc]) => rr === r && cc === c));
    }
  }
});
