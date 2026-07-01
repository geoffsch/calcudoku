// Board / puzzle model.
//
// Defines the data structures the rest of the app operates on. A puzzle is a
// grid of size N (values 1..N), partitioned into cages. Player state (entered
// values and pencil marks) is kept separate from the immutable puzzle so we can
// reset without regenerating.
//
// Sketch of the shapes (to be firmed up in code):
//
//   Puzzle = {
//     size: number,            // N, grid is N x N
//     solution: number[][],    // the unique solved Latin square
//     cages: Cage[],
//   }
//
//   Cage = {
//     cells: [row, col][],     // contiguous group of cells
//     op: "+" | "-" | "*" | "/" | "=",  // "=" for single-cell (a given)
//     target: number,          // clue value shown in the top-left cell
//   }
//
//   PlayerState = {
//     values: (number | null)[][],   // committed entries
//     marks: Set<number>[][],        // pencil "maybe" candidates per cell
//   }

export {};
