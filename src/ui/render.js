// Rendering: turns puzzle + player state into DOM.
//
//   - mountUI(container, game)  -> build board, number pad, controls
//   - renderBoard(...)          -> draw cells, cage borders, clue labels
//   - renderCell(...)           -> committed value or pencil-mark grid
//
// Cage borders are the fiddly bit: draw a thick edge only between cells that
// belong to DIFFERENT cages, thin lines otherwise.

export {};
