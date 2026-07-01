// Puzzle generator.
//
// Produces a Calcudoku puzzle with a GUARANTEED UNIQUE solution. Rough algorithm
// (see PLAN.md for detail and difficulty tuning):
//
//   1. Build a random Latin square of size N  -> the solution.
//   2. Partition the grid into contiguous cages (sizes ~1..4).
//   3. Assign each cage an operation + target consistent with the solution
//      values ( - and / only for 2-cell cages; + and * for any size ).
//   4. Run the solver (solver.js) to count solutions.
//        - exactly 1  -> keep the puzzle.
//        - otherwise  -> merge/re-shape cages or regenerate and retry.
//
// Difficulty is driven by grid size, cage sizes, and the mix of operations
// (single-cell "givens" make puzzles easier).

// export function generatePuzzle({ size, difficulty }) { /* TODO */ }

export {};
