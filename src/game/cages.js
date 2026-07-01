// Cage helpers: partitioning the grid into contiguous groups, and validating a
// set of cell values against a cage's operation and target.
//
//   - randomPartition(size, ...) -> Cage[] of contiguous cells
//   - satisfies(cage, values)    -> boolean (does this assignment meet the clue)
//   - clueLabel(cage)            -> string shown in the UI, e.g. "12+", "3-", "5"
//
// Operation semantics:
//   +  sum of cells === target
//   *  product of cells === target
//   -  |a - b| === target            (2-cell only)
//   /  max/min === target (exact)    (2-cell only)
//   =  single cell equals target (a given)

export {};
