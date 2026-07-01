// Rendering: turns puzzle + player state into DOM. Pure "build and update" —
// no event handling here (see input.js) and no game rules (see src/game).

import { clueLabel, cageIndexOf } from "../game/cages.js";
import { hasMark } from "../game/board.js";

// Build the board grid for a puzzle. Returns cellEls[r][c] for updates.
// Cage borders: a cell gets a thick edge on each side where the neighbour
// belongs to a different cage (or is the grid edge).
export function buildBoard(boardEl, puzzle) {
  const n = puzzle.size;
  const index = cageIndexOf(puzzle.cages, n);

  boardEl.textContent = "";
  boardEl.style.setProperty("--n", n);

  // The clue sits in the first cell (row-major) of each cage.
  const clueAt = new Map();
  for (const cage of puzzle.cages) {
    const [r, c] = cage.cells[0];
    clueAt.set(`${r},${c}`, clueLabel(cage));
  }

  // Pencil-mark mini-grid: digit d sits at a fixed position so marks never
  // jump around; grid is as square as possible for the size.
  const markCols = n <= 4 ? 2 : 3;

  const cellEls = [];
  for (let r = 0; r < n; r++) {
    const rowEls = [];
    for (let c = 0; c < n; c++) {
      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = "cell";
      cell.dataset.r = r;
      cell.dataset.c = c;
      cell.setAttribute("aria-label", `row ${r + 1}, column ${c + 1}`);

      if (r === 0 || index[r - 1][c] !== index[r][c]) cell.classList.add("cage-t");
      if (r === n - 1 || index[r + 1][c] !== index[r][c]) cell.classList.add("cage-b");
      if (c === 0 || index[r][c - 1] !== index[r][c]) cell.classList.add("cage-l");
      if (c === n - 1 || index[r][c + 1] !== index[r][c]) cell.classList.add("cage-r");

      const clue = clueAt.get(`${r},${c}`);
      if (clue) {
        const clueEl = document.createElement("span");
        clueEl.className = "clue";
        clueEl.textContent = clue;
        cell.appendChild(clueEl);
      }

      const valueEl = document.createElement("span");
      valueEl.className = "value";
      cell.appendChild(valueEl);

      const marksEl = document.createElement("span");
      marksEl.className = "marks";
      marksEl.style.setProperty("--mark-cols", markCols);
      for (let d = 1; d <= n; d++) {
        const m = document.createElement("span");
        m.className = "mark";
        marksEl.appendChild(m);
      }
      cell.appendChild(marksEl);

      boardEl.appendChild(cell);
      rowEls.push(cell);
    }
    cellEls.push(rowEls);
  }
  return cellEls;
}

// Refresh every cell from state. n <= 9 so a full pass is trivially cheap and
// far simpler than change tracking.
export function updateBoard(cellEls, puzzle, state) {
  const n = puzzle.size;
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const cell = cellEls[r][c];
      const value = state.values[r][c];
      cell.querySelector(".value").textContent = value === 0 ? "" : value;

      const markEls = cell.querySelector(".marks").children;
      for (let d = 1; d <= n; d++) {
        markEls[d - 1].textContent = value === 0 && hasMark(state.marks, r, c, d) ? d : "";
      }

      const selected =
        state.selected !== null && state.selected[0] === r && state.selected[1] === c;
      cell.classList.toggle("selected", selected);
    }
  }
}

// Number pad: digit buttons 1..n. Handlers receive the digit.
export function buildNumberPad(padEl, n, onDigit) {
  padEl.textContent = "";
  for (let d = 1; d <= n; d++) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "pad-digit";
    btn.textContent = d;
    btn.addEventListener("click", () => onDigit(d));
    padEl.appendChild(btn);
  }
}
