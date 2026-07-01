// Cage helpers: partitioning the grid into contiguous groups, assigning each
// group an operation + target consistent with a solution, and validating
// player values against a cage's clue.
//
// Cage shape: { cells: [[row, col], ...], op, target }
//   - cells are sorted by (row, col); cells[0] is where the clue is drawn.
//   - op is one of "+", "-", "*", "/", "=" ("=" is a single-cell given).
//
// Operation semantics:
//   +  sum of cells === target
//   *  product of cells === target
//   -  |a - b| === target            (2-cell cages only)
//   /  max / min === target, exact   (2-cell cages only)
//   =  single cell equals target

import { shuffle, choice, weightedChoice } from "./rng.js";

// ---------------------------------------------------------------------------
// Partitioning

// Split an n×n grid into contiguous cages by seed-and-grow: visit cells in
// random order; each unassigned cell seeds a cage that grows by absorbing
// random unassigned orthogonal neighbours until it reaches a size drawn from
// `sizeWeights` (e.g. { 2: 4, 3: 4, 4: 1 }) or runs out of neighbours.
export function randomPartition(n, sizeWeights, rng) {
  const cageIndex = Array.from({ length: n }, () => new Array(n).fill(-1));
  const cages = [];
  const sizes = Object.keys(sizeWeights).map(Number);
  const weights = sizes.map((s) => sizeWeights[s]);

  const order = [];
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) order.push([r, c]);
  shuffle(order, rng);

  for (const [seedR, seedC] of order) {
    if (cageIndex[seedR][seedC] !== -1) continue;
    const id = cages.length;
    const targetSize = weightedChoice(sizes, weights, rng);
    const cells = [[seedR, seedC]];
    cageIndex[seedR][seedC] = id;

    while (cells.length < targetSize) {
      const frontier = [];
      for (const [r, c] of cells) {
        for (const [nr, nc] of neighbours(r, c, n)) {
          if (cageIndex[nr][nc] === -1) frontier.push([nr, nc]);
        }
      }
      if (frontier.length === 0) break;
      const [r, c] = choice(frontier, rng);
      cageIndex[r][c] = id;
      cells.push([r, c]);
    }
    cages.push({ cells: sortCells(cells) });
  }
  return cages;
}

// Reduce the number of single-cell cages ("givens") to at most `maxGivens` by
// merging surplus singletons into a random adjacent cage, provided the merged
// cage stays within `maxSize`. Merging can leave some singletons in place when
// all neighbours are already at maxSize — that's accepted rather than forced.
export function mergeSingletons(cages, n, maxGivens, maxSize, rng) {
  const index = cageIndexOf(cages, n);
  const order = shuffle(cages.map((_, i) => i), rng);
  const countGivens = () => cages.filter((cage) => cage.cells.length === 1).length;

  for (const i of order) {
    if (countGivens() <= maxGivens) break;
    if (cages[i].cells.length !== 1) continue;
    const [r, c] = cages[i].cells[0];
    const candidates = [];
    for (const [nr, nc] of neighbours(r, c, n)) {
      const j = index[nr][nc];
      if (j !== i && cages[j].cells.length < maxSize) candidates.push(j);
    }
    if (candidates.length === 0) continue;
    const j = choice(candidates, rng);
    cages[j].cells = sortCells(cages[j].cells.concat(cages[i].cells));
    cages[i].cells = [];
    for (const [rr, cc] of cages[j].cells) index[rr][cc] = j;
  }
  return cages.filter((cage) => cage.cells.length > 0);
}

// Split one cage into two contiguous cages by cutting a random edge of a BFS
// spanning tree over its cells. Both halves stay contiguous by construction.
// Returns the two new cages (without op/target — reassign after splitting).
export function splitCage(cage, rng) {
  const cells = cage.cells;
  const key = ([r, c]) => `${r},${c}`;
  const inCage = new Set(cells.map(key));

  // BFS spanning tree from a random root.
  const root = choice(cells, rng);
  const parent = new Map([[key(root), null]]);
  const queue = [root];
  const treeEdges = [];
  while (queue.length) {
    const [r, c] = queue.shift();
    for (const [nr, nc] of shuffle([[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]], rng)) {
      const k = `${nr},${nc}`;
      if (!inCage.has(k) || parent.has(k)) continue;
      parent.set(k, key([r, c]));
      treeEdges.push([k, key([r, c])]);
      queue.push([nr, nc]);
    }
  }

  // Cut a random tree edge: the child's subtree becomes one cage.
  const [childKey] = choice(treeEdges, rng);
  const childSet = new Set([childKey]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const [k, p] of parent) {
      if (!childSet.has(k) && childSet.has(p)) {
        childSet.add(k);
        grew = true;
      }
    }
  }
  const a = cells.filter((cell) => childSet.has(key(cell)));
  const b = cells.filter((cell) => !childSet.has(key(cell)));
  return [{ cells: sortCells(a) }, { cells: sortCells(b) }];
}

// ---------------------------------------------------------------------------
// Operations and targets

// Give each cage an op + target consistent with `solution`. opWeights has two
// weight tables: `pair` for 2-cell cages ({ "+": w, "-": w, "*": w, "/": w })
// and `multi` for 3+ cells ({ "+": w, "*": w }). Mutates and returns `cages`.
export function assignOps(cages, solution, opWeights, rng) {
  for (const cage of cages) {
    const vals = cage.cells.map(([r, c]) => solution[r][c]);
    if (vals.length === 1) {
      cage.op = "=";
      cage.target = vals[0];
    } else if (vals.length === 2) {
      const [a, b] = vals;
      const ops = ["+", "-", "*"];
      // Exact division only. a !== b always (2-cell cages share a row or
      // column, so Latin-ness forces distinct values).
      if (Math.max(a, b) % Math.min(a, b) === 0) ops.push("/");
      const op = weightedChoice(ops, ops.map((o) => opWeights.pair[o] ?? 0), rng);
      cage.op = op;
      cage.target = pairTarget(op, a, b);
    } else {
      const ops = ["+", "*"];
      const op = weightedChoice(ops, ops.map((o) => opWeights.multi[o] ?? 0), rng);
      cage.op = op;
      cage.target = op === "+" ? vals.reduce((s, v) => s + v, 0) : vals.reduce((p, v) => p * v, 1);
    }
  }
  return cages;
}

function pairTarget(op, a, b) {
  switch (op) {
    case "+": return a + b;
    case "-": return Math.abs(a - b);
    case "*": return a * b;
    case "/": return Math.max(a, b) / Math.min(a, b);
    default: throw new Error(`bad pair op ${op}`);
  }
}

// Does this complete assignment of cage-cell values meet the clue?
// `vals` is an array of values aligned with cage.cells.
export function satisfies(cage, vals) {
  switch (cage.op) {
    case "=":
      return vals.length === 1 && vals[0] === cage.target;
    case "+":
      return vals.reduce((s, v) => s + v, 0) === cage.target;
    case "*":
      return vals.reduce((p, v) => p * v, 1) === cage.target;
    case "-":
      return vals.length === 2 && Math.abs(vals[0] - vals[1]) === cage.target;
    case "/": {
      if (vals.length !== 2) return false;
      const [hi, lo] = vals[0] > vals[1] ? vals : [vals[1], vals[0]];
      return lo * cage.target === hi;
    }
    default:
      return false;
  }
}

const OP_SYMBOLS = { "+": "+", "-": "−", "*": "×", "/": "÷", "=": "" };

// Clue text shown in the cage's top-left cell, e.g. "12+", "3−", "2÷", "5".
export function clueLabel(cage) {
  return `${cage.target}${OP_SYMBOLS[cage.op]}`;
}

// ---------------------------------------------------------------------------
// Shared helpers

export function isContiguous(cells) {
  if (cells.length === 0) return false;
  const key = ([r, c]) => `${r},${c}`;
  const inCage = new Set(cells.map(key));
  const seen = new Set([key(cells[0])]);
  const queue = [cells[0]];
  while (queue.length) {
    const [r, c] = queue.shift();
    for (const next of [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]]) {
      const k = key(next);
      if (inCage.has(k) && !seen.has(k)) {
        seen.add(k);
        queue.push(next);
      }
    }
  }
  return seen.size === cells.length;
}

// n×n array mapping each cell to the index of its cage in `cages`.
export function cageIndexOf(cages, n) {
  const index = Array.from({ length: n }, () => new Array(n).fill(-1));
  cages.forEach((cage, i) => {
    for (const [r, c] of cage.cells) index[r][c] = i;
  });
  return index;
}

function neighbours(r, c, n) {
  const out = [];
  if (r > 0) out.push([r - 1, c]);
  if (r < n - 1) out.push([r + 1, c]);
  if (c > 0) out.push([r, c - 1]);
  if (c < n - 1) out.push([r, c + 1]);
  return out;
}

function sortCells(cells) {
  return cells.slice().sort(([r1, c1], [r2, c2]) => r1 - r2 || c1 - c2);
}
