// App chrome: header, action buttons (pen/notes, erase, undo), the new-game
// dialog and the board overlay (generating / solved states). Builds the DOM
// once and exposes references + small show/hide helpers; behaviour is wired
// up by main.js.

import { MIN_SIZE, MAX_SIZE, DIFFICULTIES } from "../game/generator.js";
import { APP_VERSION } from "../version.js";

// handlers: { onNewGame(size, difficulty), onMode(mode), onErase(), onUndo(), onDigit(d) }
export function buildChrome(root, handlers) {
  root.textContent = "";

  // --- Header -------------------------------------------------------------
  const header = el("header", "topbar");
  const title = el("h1", "title", "Calcudoku");
  const info = el("span", "puzzle-info");
  const newBtn = button("btn btn-new", "New game");
  header.append(title, info, newBtn);

  // --- Board + overlay ----------------------------------------------------
  const boardWrap = el("div", "board-wrap");
  const board = el("div", "board");
  board.setAttribute("role", "grid");
  board.setAttribute("aria-label", "Puzzle board");
  const overlay = el("div", "overlay hidden");
  boardWrap.append(board, overlay);

  // --- Controls: number pad + actions --------------------------------------
  const pad = el("div", "pad");
  const digits = el("div", "pad-digits");
  const actions = el("div", "pad-actions");

  const penBtn = button("btn mode-btn active", "Pen");
  const notesBtn = button("btn mode-btn", "Notes");
  const modeGroup = el("div", "mode-group");
  modeGroup.append(penBtn, notesBtn);

  const eraseBtn = button("btn", "Erase");
  const undoBtn = button("btn", "Undo");
  actions.append(modeGroup, eraseBtn, undoBtn);
  pad.append(digits, actions);

  // --- Version footer -------------------------------------------------------
  const footer = el("footer", "app-version", `v${APP_VERSION}`);

  root.append(header, boardWrap, pad, footer);

  // --- New-game dialog ------------------------------------------------------
  const dialog = buildNewGameDialog(handlers.onNewGame);
  root.appendChild(dialog.el);

  newBtn.addEventListener("click", () => dialog.open());
  eraseBtn.addEventListener("click", handlers.onErase);
  undoBtn.addEventListener("click", handlers.onUndo);
  penBtn.addEventListener("click", () => handlers.onMode("pen"));
  notesBtn.addEventListener("click", () => handlers.onMode("pencil"));

  return {
    board,
    digits,
    info,
    setMode(mode) {
      penBtn.classList.toggle("active", mode === "pen");
      notesBtn.classList.toggle("active", mode === "pencil");
    },
    setInfo(text) {
      info.textContent = text;
    },
    showOverlay(html) {
      overlay.innerHTML = html;
      overlay.classList.remove("hidden");
      return overlay;
    },
    hideOverlay() {
      overlay.classList.add("hidden");
    },
    openNewGameDialog: (canCancel) => dialog.open(canCancel),
    setDialogDefaults: (size, difficulty) => dialog.setDefaults(size, difficulty),
  };
}

function buildNewGameDialog(onNewGame) {
  const dlg = document.createElement("dialog");
  dlg.className = "newgame-dialog";

  const form = el("form", "newgame-form");
  form.method = "dialog";

  form.appendChild(el("h2", "", "New game"));

  form.appendChild(el("p", "field-label", "Size"));
  const sizeRow = el("div", "choice-row");
  const sizeButtons = new Map();
  for (let s = MIN_SIZE; s <= MAX_SIZE; s++) {
    const b = button("choice", `${s}×${s}`);
    b.dataset.value = s;
    sizeButtons.set(s, b);
    sizeRow.appendChild(b);
  }
  form.appendChild(sizeRow);

  form.appendChild(el("p", "field-label", "Difficulty"));
  const diffRow = el("div", "choice-row");
  const diffButtons = new Map();
  for (const d of DIFFICULTIES) {
    const b = button("choice", d);
    b.dataset.value = d;
    diffButtons.set(d, b);
    diffRow.appendChild(b);
  }
  form.appendChild(diffRow);

  let size = 4;
  let difficulty = "easy";
  const select = () => {
    for (const [s, b] of sizeButtons) b.classList.toggle("active", s === size);
    for (const [d, b] of diffButtons) b.classList.toggle("active", d === difficulty);
  };
  sizeRow.addEventListener("click", (e) => {
    const b = e.target.closest("button.choice");
    if (!b) return;
    e.preventDefault();
    size = Number(b.dataset.value);
    select();
  });
  diffRow.addEventListener("click", (e) => {
    const b = e.target.closest("button.choice");
    if (!b) return;
    e.preventDefault();
    difficulty = b.dataset.value;
    select();
  });

  const buttons = el("div", "dialog-buttons");
  const cancelBtn = button("btn", "Cancel");
  cancelBtn.value = "cancel";
  const startBtn = button("btn btn-primary", "Start");
  startBtn.value = "start";
  buttons.append(cancelBtn, startBtn);
  form.appendChild(buttons);
  dlg.appendChild(form);

  startBtn.addEventListener("click", (e) => {
    e.preventDefault();
    dlg.close();
    onNewGame(size, difficulty);
  });
  cancelBtn.addEventListener("click", (e) => {
    e.preventDefault();
    dlg.close();
  });

  return {
    el: dlg,
    open(canCancel = true) {
      cancelBtn.classList.toggle("hidden", !canCancel);
      select();
      dlg.showModal();
    },
    setDefaults(s, d) {
      size = s;
      difficulty = d;
    },
  };
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function button(className, text) {
  const b = el("button", className, text);
  b.type = "button";
  return b;
}
