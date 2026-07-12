# Calcudoku

An offline Calcudoku puzzle game for Android, built as an installable
Progressive Web App. It generates puzzles with a guaranteed unique solution and
provides a touch-friendly board for solving them, including pencil-mark
candidates for cells whose value isn't yet decided.

**Live demo:** https://geoffsch.github.io/calcudoku/

> Calcudoku (also known as Mathdoku) is the trademark-free name for the puzzle
> commercially sold as "KenKen™". The puzzle mechanic is not protected and is
> free to implement; only the "KenKen" name is trademarked.

## Features

- Generates Calcudoku puzzles with a **single guaranteed solution**.
- Selectable grid size and difficulty.
- **Pencil marks:** record candidate "maybe" values in a cell before committing.
- Runs fully **offline** once installed, and remembers a game in progress.
- Installs to the home screen and runs full-screen — no app store required.

## How to play

Fill the grid so every row and every column contains each number exactly once
(like Sudoku), and every outlined "cage" satisfies its little clue — `12+`
means the cage's numbers sum to 12, `2÷` means one divides the other to give
2, and a bare number is given directly. There is always exactly one solution,
and no guessing is ever required.

Tap a cell, then tap a number. **Pen** enters an answer (tap the same number
again to clear it); **Notes** pencils in candidate values while you reason.
Entering an answer automatically erases that candidate from the notes in its
row and column. Erase and Undo do what they say. On a keyboard: digits to
enter, arrows to move, `N` toggles notes, `U` or `Ctrl+Z` undoes,
Backspace erases.

## Tech

Plain HTML, CSS, and JavaScript (ES modules), with **no build step** — the app
is served as static files. It has **no runtime dependencies**; the only tooling
is a test runner and a static file server used during development. Offline
support and installability come from a web app manifest and a service worker
(loaded as an ES module, so a Chromium-based browser such as Chrome is required —
which matches the Android target).

The puzzle engine under `src/game/` is deliberately free of any browser/DOM code
so it can be unit-tested in Node.

## Project structure

```
calcudoku/
├── index.html              # app shell / mount point
├── manifest.webmanifest    # PWA metadata (name, icons, display mode)
├── service-worker.js       # offline caching of the app shell
├── styles/
│   └── main.css            # layout + board styling
├── src/
│   ├── main.js             # entry point: wires engine ↔ UI, registers SW
│   ├── version.js          # single source of truth for the app version
│   ├── game/               # pure puzzle logic, no DOM (unit-tested)
│   │   ├── board.js        # puzzle + player-state data model
│   │   ├── generator.js    # builds puzzles with a unique solution
│   │   ├── solver.js       # constraint solver (uniqueness check)
│   │   ├── cages.js        # cage partitioning + clue validation
│   │   ├── latin.js        # random Latin squares (every solution is one)
│   │   └── rng.js          # seedable randomness (reproducible tests)
│   ├── ui/                 # everything that touches the DOM
│   │   ├── render.js       # draw board, cage borders, clues, number pad
│   │   ├── input.js        # cell selection, entry, pencil-mark toggling
│   │   └── controls.js     # new-game, size/difficulty, pen/pencil mode
│   └── state/
│       └── storage.js      # save/restore in-progress game (localStorage)
├── assets/icons/           # app icons
├── tests/                  # Node test-runner tests for the game logic
├── tools/
│   ├── serve.js            # dependency-free static server for local dev
│   └── make-icons.js       # regenerates the PNG app icons (plain Node)
├── package.json            # dev scripts only (test + local serve)
└── CLAUDE.md               # engineering notes and conventions
```

## Development

The app is static files, but browsers block ES modules and service workers over
`file://`, so serve it over HTTP. Any static server works, for example:

```bash
npm run serve   # dependency-free Node server, http://localhost:8123
```

(or any static server, e.g. `python -m http.server`).

Run the puzzle-logic tests (requires Node.js):

```bash
npm test        # equivalently: node --test
```

## Deployment

The app is hosted as static files on any HTTPS static host; HTTPS is required for
a Progressive Web App to be installable. [GitHub Pages](https://pages.github.com/)
is the simplest option:

1. Push the repository to GitHub.
2. In the repository, go to **Settings → Pages**, set **Source** to
   "Deploy from a branch", branch `main`, folder `/ (root)`, and save.
3. After a minute, Pages serves the app at
   `https://<username>.github.io/<repo>/`.

When updating a deployed app, bump `APP_VERSION` in `src/version.js` (and the
matching `version` in `package.json`). The service worker derives its cache name
from it, so the bump busts the offline cache and installed clients fetch the new
files. The app footer shows the running version, so you can confirm a device has
picked up the update.

## Installing on a phone

Open the deployed URL in a mobile browser (Chrome on Android), then use the
browser menu's **Install app** / **Add to Home screen** option. The app then
launches full-screen from the home screen and works offline.

## License

Personal project, provided as-is. Not affiliated with the KenKen trademark
holder.
