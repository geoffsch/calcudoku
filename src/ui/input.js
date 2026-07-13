// Input wiring: cell selection by tap/click (event delegation on the board)
// and a keyboard layer for desktop play — digits enter values, arrows move
// the selection, Backspace/Delete erases, N toggles notes, U/Ctrl+Z undoes,
// Escape clears the selection.

// actions: { onSelect(r, c), onDigit(d), onErase(), onUndo(), onToggleMode(), size() }
export function attachBoardInput(boardEl, actions) {
  boardEl.addEventListener("click", (e) => {
    const cell = e.target.closest(".cell");
    if (!cell || !boardEl.contains(cell)) return;
    actions.onSelect(Number(cell.dataset.r), Number(cell.dataset.c));
  });
}

export function attachKeyboardInput(actions) {
  document.addEventListener("keydown", (e) => {
    // Never fight a modal dialog or a real input field.
    if (document.querySelector("dialog[open]")) return;
    if (e.target instanceof HTMLElement && /^(input|textarea|select)$/i.test(e.target.tagName)) {
      return;
    }

    const n = actions.size();
    if (/^[1-9]$/.test(e.key) && Number(e.key) <= n) {
      actions.onDigit(Number(e.key));
    } else if (e.key === "Backspace" || e.key === "Delete" || e.key === "0") {
      actions.onErase();
    } else if (e.key === "ArrowUp" || e.key === "ArrowDown" || e.key === "ArrowLeft" || e.key === "ArrowRight") {
      const [dr, dc] = {
        ArrowUp: [-1, 0],
        ArrowDown: [1, 0],
        ArrowLeft: [0, -1],
        ArrowRight: [0, 1],
      }[e.key];
      actions.onMove(dr, dc);
    } else if (e.key === "n" || e.key === "N") {
      actions.onToggleMode();
    } else if (e.key === "u" || e.key === "U" || (e.key === "z" && (e.ctrlKey || e.metaKey))) {
      actions.onUndo();
    } else if (e.key === "Escape") {
      actions.onClear();
    } else {
      return;
    }
    e.preventDefault();
  });
}
