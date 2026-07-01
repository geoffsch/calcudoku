// Constraint solver. Its one job: given a puzzle { size, cages }, find its
// solutions — used by the generator to verify a candidate puzzle has exactly
// one. Backtracking search with:
//   - row/column bitmasks (Latin-square constraint),
//   - per-cage pruning specialised by operation (see cageAllows),
//   - MRV ordering: always branch on the cell with the fewest candidates.
// Stops as soon as `limit` solutions are found (2 suffices for "unique or
// not"), so the common case — unique puzzle — never pays for a full count.

import { cageIndexOf } from "./cages.js";

// Returns up to `limit` solutions, each an n×n grid of 1..n. The search is
// exhaustive, so fewer than `limit` results means that is the true count.
export function findSolutions(puzzle, limit = 2) {
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
  const maxProd = [1];
  for (let k = 1; k <= n; k++) maxProd.push(maxProd[k - 1] * n);

  const grid = new Array(total).fill(0);
  const rowMask = new Array(n).fill(0);
  const colMask = new Array(n).fill(0);
  const solutions = [];
  let filled = 0;

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
        // Remaining cells each contribute between 1 and n.
        return sum + (rem - 1) <= cage.target && sum + (rem - 1) * n >= cage.target;
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
      if (solutions.length >= limit) return;
    }
  }

  search();
  return solutions;
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
