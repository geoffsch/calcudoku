// Latin squares: an N×N grid where every row and every column contains each of
// the values 1..N exactly once. Every Calcudoku solution is a Latin square.

import { shuffle } from "./rng.js";

// Generate a random N×N Latin square via backtracking with shuffled candidate
// order. Not uniformly distributed over all Latin squares, but varied enough
// for puzzle generation, and effectively instant for n <= 9.
export function randomLatinSquare(n, rng = Math.random) {
  const grid = Array.from({ length: n }, () => new Array(n).fill(0));
  // Bitmask of values already used per row / column (bit v set = value v used).
  const rowUsed = new Array(n).fill(0);
  const colUsed = new Array(n).fill(0);
  const values = Array.from({ length: n }, (_, i) => i + 1);

  function fill(idx) {
    if (idx === n * n) return true;
    const r = Math.floor(idx / n);
    const c = idx % n;
    for (const v of shuffle(values.slice(), rng)) {
      const bit = 1 << v;
      if ((rowUsed[r] & bit) || (colUsed[c] & bit)) continue;
      grid[r][c] = v;
      rowUsed[r] |= bit;
      colUsed[c] |= bit;
      if (fill(idx + 1)) return true;
      grid[r][c] = 0;
      rowUsed[r] &= ~bit;
      colUsed[c] &= ~bit;
    }
    return false;
  }

  fill(0);
  return grid;
}

// True if `grid` is a complete, valid Latin square of values 1..n.
export function isLatinSquare(grid) {
  const n = grid.length;
  const full = ((1 << (n + 1)) - 1) & ~1; // bits 1..n set
  for (let r = 0; r < n; r++) {
    if (!Array.isArray(grid[r]) || grid[r].length !== n) return false;
    let rowMask = 0;
    let colMask = 0;
    for (let c = 0; c < n; c++) {
      const rv = grid[r][c];
      const cv = grid[c][r];
      if (!Number.isInteger(rv) || rv < 1 || rv > n) return false;
      rowMask |= 1 << rv;
      colMask |= 1 << cv;
    }
    if (rowMask !== full || colMask !== full) return false;
  }
  return true;
}
