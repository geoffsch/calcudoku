// Constraint solver.
//
// Used by the generator to verify a candidate puzzle has exactly one solution.
// Backtracking search with constraint propagation:
//   - row/column Latin-square constraints (each value once per row and column)
//   - cage constraints (cells in a cage must satisfy op/target)
//
// Counts solutions but can early-exit as soon as a SECOND solution is found —
// we only need "unique or not", not the full count.

// export function countSolutions(puzzle, limit = 2) { /* TODO */ }

export {};
