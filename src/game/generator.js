// Puzzle generator. Produces a Calcudoku puzzle with a GUARANTEED unique
// solution:
//
//   1. Build a random Latin square -> the solution.
//   2. Partition the grid into contiguous cages (difficulty sets the size mix).
//   3. Assign each cage an op + target consistent with the solution.
//   4. Count solutions with the solver.
//        exactly 1 -> done.
//        more      -> split a cage that contains a cell where two solutions
//                     differ (strictly adds constraints), and recount.
//
// Splitting always terminates: every split increases the cage count, and the
// all-singletons limit is trivially unique. In practice 0-2 splits suffice.
// A few fresh partitions are tried before leaning on splits, so puzzles don't
// accumulate splint-y single-cell cages.
//
// Because targets are derived FROM the solution, the solution always satisfies
// the clues; when the count is exactly 1, that one solution is ours.

import { randomLatinSquare } from "./latin.js";
import {
  randomPartition,
  mergeSingletons,
  splitCage,
  assignOps,
  cageIndexOf,
} from "./cages.js";
import { solvePuzzle } from "./solver.js";

export const MIN_SIZE = 4;
export const MAX_SIZE = 9;
export const DIFFICULTIES = ["easy", "medium", "hard"];

// Heuristic difficulty knobs. Bigger cages, fewer givens and more ×/÷ make a
// puzzle harder; values chosen by playtesting feel, not science.
const CONFIGS = {
  easy: {
    sizeWeights: () => ({ 1: 1.5, 2: 5, 3: 3 }),
    maxCageSize: 3,
    maxGivens: (n) => Math.max(2, Math.ceil(n / 2)),
    opWeights: { pair: { "+": 3, "-": 3, "*": 2, "/": 2 }, multi: { "+": 3, "*": 1 } },
  },
  medium: {
    sizeWeights: () => ({ 1: 0.4, 2: 4, 3: 4, 4: 1.2 }),
    maxCageSize: 4,
    maxGivens: (n) => (n >= 7 ? 2 : 1),
    opWeights: { pair: { "+": 2, "-": 2, "*": 2, "/": 2 }, multi: { "+": 2, "*": 2 } },
  },
  hard: {
    sizeWeights: (n) => (n >= 7 ? { 2: 3, 3: 4, 4: 2.5, 5: 0.5 } : { 2: 3, 3: 4, 4: 2 }),
    maxCageSize: 5,
    maxGivens: () => 0,
    opWeights: { pair: { "+": 1.5, "-": 2, "*": 2.5, "/": 2 }, multi: { "+": 1.5, "*": 2.5 } },
  },
};

const FRESH_ATTEMPTS = 14; // fresh partitions to try before giving up
const BASE_NODE_BUDGET = 30_000; // solver nodes; doubles each failed attempt

// Generate a puzzle: { size, difficulty, cages, solution }. Throws on invalid
// arguments; always returns a verified-unique puzzle otherwise.
export function generatePuzzle({ size, difficulty = "medium", rng = Math.random }) {
  if (!Number.isInteger(size) || size < MIN_SIZE - 1 || size > MAX_SIZE) {
    // MIN_SIZE - 1 = 3 is allowed for tests; the UI offers 4..9.
    throw new Error(`size must be an integer in 3..${MAX_SIZE}, got ${size}`);
  }
  const config = CONFIGS[difficulty];
  if (!config) throw new Error(`unknown difficulty "${difficulty}"`);

  const solution = randomLatinSquare(size, rng);

  for (let attempt = 0; attempt < FRESH_ATTEMPTS; attempt++) {
    let cages = randomPartition(size, config.sizeWeights(size), rng);
    cages = mergeSingletons(cages, size, config.maxGivens(size), config.maxCageSize, rng);
    assignOps(cages, solution, config.opWeights, rng);

    // Under-constrained layouts make the solver grind; rather than fight
    // them, cap its work and redraw. The budget doubles per attempt so
    // termination never hinges on drawing a friendly layout. Splits are
    // likewise capped — a layout needing many is better redrawn than shredded
    // into single-cell givens — except on the final fallback attempts, where
    // unlimited splitting guarantees termination.
    // Larger grids get a freer hand: their splittable cages are big, so
    // halves are rarely single-cell givens, and redraws (a full solve each)
    // are costlier than splits.
    const maxNodes = BASE_NODE_BUDGET * 2 ** attempt;
    const baseSplits = size >= 7 ? 3 : 1;
    const maxSplits =
      attempt < 4 ? baseSplits : attempt < FRESH_ATTEMPTS - 2 ? baseSplits + 2 : Infinity;
    const result = makeUnique({ size, cages }, solution, config, rng, maxNodes, maxSplits);
    if (result) return { size, difficulty, cages: result, solution };
  }

  // Effectively unreachable: attempt 14 has a ~250M-node budget, and every
  // split only makes the solver's job easier. Fail loudly all the same.
  throw new Error("generator failed to produce a unique puzzle");
}

// Split ambiguity-involved cages until the puzzle is unique. Returns the
// final cages array, or null if the solver blew its node budget or the split
// cap was reached (caller should redraw the partition).
function makeUnique(puzzle, solution, config, rng, maxNodes, maxSplits) {
  let { cages } = puzzle;
  const n = puzzle.size;

  // Splits strictly add constraints, so with maxSplits = Infinity this
  // terminates: in the limit every cage is a single-cell given and the
  // puzzle is trivially unique.
  for (let splits = 0; ; splits++) {
    const { solutions: found, complete } = solvePuzzle({ size: n, cages }, { limit: 2, maxNodes });
    if (!complete) return null;
    if (found.length === 1) return cages;
    if (splits >= maxSplits) return null;

    // Two solutions exist. Cells where they differ pinpoint the ambiguity;
    // split a multi-cell cage covering one of them. Prefer the largest such
    // cage: its halves won't be single-cell givens.
    const [a, b] = found;
    const index = cageIndexOf(cages, n);
    const splittable = new Set();
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (a[r][c] !== b[r][c] && cages[index[r][c]].cells.length >= 2) {
          splittable.add(index[r][c]);
        }
      }
    }
    // Differing cells always sit in multi-cell cages (a single-cell "=" cage
    // admits only one value), so splittable is never empty here.
    const maxLen = Math.max(...[...splittable].map((i) => cages[i].cells.length));
    const biggest = [...splittable].filter((i) => cages[i].cells.length === maxLen);
    const pick = biggest[Math.floor(rng() * biggest.length)];
    const halves = splitCage(cages[pick], rng);
    assignOps(halves, solution, config.opWeights, rng);
    cages = cages.filter((_, i) => i !== pick).concat(halves);
  }
}
