// Constraint solver. Its one job: given a puzzle { size, cages }, find its
// solutions — used by the generator to verify a candidate puzzle has exactly
// one. Backtracking search with:
//   - row/column bitmasks (Latin-square constraint),
//   - per-cage pruning specialised by operation (see cageAllows),
//   - MRV ordering: always branch on the cell with the fewest candidates.
// Stops as soon as `limit` solutions are found (2 suffices for "unique or
// not"), so the common case — unique puzzle — never pays for a full count.

import { cageIndexOf } from "./cages.js";

// Full-control entry point: returns { solutions, complete }.
//   solutions — up to `limit` n×n grids of 1..n.
//   complete  — true if the search ran to exhaustion (or hit `limit`), false
//               if it gave up after `maxNodes` search nodes. The generator
//               uses a budget to discard pathological cage layouts cheaply
//               instead of grinding on them.
export function solvePuzzle(puzzle, { limit = 2, maxNodes = Infinity } = {}) {
  const n = puzzle.size;
  const total = n * n;
  const fullMask = ((1 << (n + 1)) - 1) & ~1; // bits 1..n

  // Flatten cage lookup: cellCage[idx] -> cage record with live search state.
  const index2d = cageIndexOf(puzzle.cages, n);
  const cages = puzzle.cages.map((cage) => ({
    op: cage.op,
    target: cage.target,
    cellIdxs: cage.cells.map(([r, c]) => r * n + c),
    remaining: cage.cells.length,
    sum: 0,
    prod: 1,
  }));
  const cellCage = new Array(total);
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) cellCage[r * n + c] = cages[index2d[r][c]];
  }

  // maxProd[k] = largest product k cells can contribute (n^k), for * pruning.
  // Sized to the largest cage — cages can hold more than n cells.
  const maxCageLen = Math.max(...cages.map((cage) => cage.cellIdxs.length));
  const maxProd = [1];
  for (let k = 1; k <= maxCageLen; k++) maxProd.push(maxProd[k - 1] * n);

  const grid = new Array(total).fill(0);
  const rowMask = new Array(n).fill(0);
  const colMask = new Array(n).fill(0);
  const solutions = [];
  let filled = 0;
  let nodes = 0;
  let aborted = false;

  // Can value v go in cell idx as far as its cage is concerned? Latin
  // constraints are already applied via the row/col masks before this.
  function cageAllows(cage, idx, v) {
    const rem = cage.remaining; // unfilled cells in this cage, including idx
    switch (cage.op) {
      case "=":
        return v === cage.target;
      case "+": {
        const sum = cage.sum + v;
        if (rem === 1) return sum === cage.target;
        // Bound the remaining cells by their actual row/column candidates
        // (pretending v is placed), not the loose 1..n range.
        const vBit = 1 << v;
        let lo = sum;
        let hi = sum;
        for (const other of cage.cellIdxs) {
          if (other === idx || grid[other] !== 0) continue;
          let m = ~(rowMask[Math.floor(other / n)] | colMask[other % n]) & fullMask;
          if (Math.floor(other / n) === Math.floor(idx / n) || other % n === idx % n) {
            m &= ~vBit;
          }
          if (m === 0) return false;
          lo += 31 - Math.clz32(m & -m); // lowest set bit = min candidate
          hi += 31 - Math.clz32(m); // highest set bit = max candidate
        }
        return lo <= cage.target && hi >= cage.target;
      }
      case "*": {
        // Invariant: cage.prod divides target (only divisor values get placed).
        const quotient = cage.target / cage.prod;
        if (rem === 1) return v === quotient;
        if (quotient % v !== 0) return false;
        return quotient / v <= maxProd[rem - 1];
      }
      case "-": {
        if (rem === 1) {
          const other = otherValue(cage, idx);
          return Math.abs(v - other) === cage.target;
        }
        return v + cage.target <= n || v - cage.target >= 1;
      }
      case "/": {
        if (rem === 1) {
          const other = otherValue(cage, idx);
          return v === other * cage.target || other === v * cage.target;
        }
        return v * cage.target <= n || v % cage.target === 0;
      }
      default:
        return false;
    }
  }

  function otherValue(cage, idx) {
    const [a, b] = cage.cellIdxs;
    return grid[a === idx ? b : a];
  }

  function candidates(idx) {
    const r = Math.floor(idx / n);
    const c = idx % n;
    let mask = ~(rowMask[r] | colMask[c]) & fullMask;
    let out = 0;
    while (mask) {
      const bit = mask & -mask;
      mask ^= bit;
      const v = 31 - Math.clz32(bit);
      if (cageAllows(cellCage[idx], idx, v)) out |= bit;
    }
    return out;
  }

  function place(idx, v) {
    const cage = cellCage[idx];
    grid[idx] = v;
    rowMask[Math.floor(idx / n)] |= 1 << v;
    colMask[idx % n] |= 1 << v;
    cage.remaining--;
    cage.sum += v;
    cage.prod *= v;
    filled++;
  }

  function unplace(idx, v) {
    const cage = cellCage[idx];
    grid[idx] = 0;
    rowMask[Math.floor(idx / n)] &= ~(1 << v);
    colMask[idx % n] &= ~(1 << v);
    cage.remaining++;
    cage.sum -= v;
    cage.prod /= v;
    filled--;
  }

  function search() {
    if (++nodes > maxNodes) {
      aborted = true;
      return;
    }
    if (filled === total) {
      const solution = [];
      for (let r = 0; r < n; r++) solution.push(grid.slice(r * n, (r + 1) * n));
      solutions.push(solution);
      return;
    }

    // MRV: branch on the empty cell with the fewest candidates.
    let bestIdx = -1;
    let bestMask = 0;
    let bestCount = Infinity;
    for (let idx = 0; idx < total; idx++) {
      if (grid[idx] !== 0) continue;
      const mask = candidates(idx);
      const count = popcount(mask);
      if (count === 0) return; // dead end
      if (count < bestCount) {
        bestIdx = idx;
        bestMask = mask;
        bestCount = count;
        if (count === 1) break;
      }
    }

    let mask = bestMask;
    while (mask) {
      const bit = mask & -mask;
      mask ^= bit;
      const v = 31 - Math.clz32(bit);
      place(bestIdx, v);
      search();
      unplace(bestIdx, v);
      if (solutions.length >= limit || aborted) return;
    }
  }

  search();
  return { solutions, complete: !aborted };
}

// Returns up to `limit` solutions. The search is exhaustive, so fewer than
// `limit` results means that is the true count.
export function findSolutions(puzzle, limit = 2) {
  return solvePuzzle(puzzle, { limit }).solutions;
}

// Number of solutions, capped at `limit`. countSolutions(p) === 1 means the
// puzzle is proven unique.
export function countSolutions(puzzle, limit = 2) {
  return findSolutions(puzzle, limit).length;
}

function popcount(x) {
  let count = 0;
  while (x) {
    x &= x - 1;
    count++;
  }
  return count;
}
