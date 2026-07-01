# Calcudoku

An offline Calcudoku puzzle game for Android, built as an installable
Progressive Web App. It generates puzzles with a guaranteed unique solution and
provides a touch-friendly board for solving them, including pencil-mark
candidates for cells whose value isn't yet decided.

> Calcudoku (also known as Mathdoku) is the trademark-free name for the puzzle
> commercially sold as "KenKen™". The puzzle mechanic is not protected and is
> free to implement; only the "KenKen" name is trademarked.

> **Status:** early skeleton — the project structure is in place but no gameplay
> is implemented yet.

## Features

- Generates Calcudoku puzzles with a **single guaranteed solution**.
- Selectable grid size and difficulty.
- **Pencil marks:** record candidate "maybe" values in a cell before committing.
- Runs fully **offline** once installed, and remembers a game in progress.
- Installs to the home screen and runs full-screen — no app store required.

## Tech

Plain HTML, CSS, and JavaScript (ES modules), with **no build step** — the app
is served as static files. It has **no runtime dependencies**; the only tooling
is a test runner and a static file server used during development. Offline
support and installability come from a web app manifest and a service worker.

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
│   ├── game/               # pure puzzle logic, no DOM (unit-tested)
│   │   ├── board.js        # puzzle + player-state data model
│   │   ├── generator.js    # builds puzzles with a unique solution
│   │   ├── solver.js       # constraint solver (uniqueness check)
│   │   └── cages.js        # cage partitioning + clue validation
│   ├── ui/                 # everything that touches the DOM
│   │   ├── render.js       # draw board, cage borders, clues, number pad
│   │   ├── input.js        # cell selection, entry, pencil-mark toggling
│   │   └── controls.js     # new-game, size/difficulty, pen/pencil mode
│   └── state/
│       └── storage.js      # save/restore in-progress game (localStorage)
├── assets/icons/           # app icons
├── tests/                  # Node test-runner tests for the game logic
├── package.json            # dev scripts only (test + local serve)
└── CLAUDE.md               # engineering notes and conventions
```

## Development

The app is static files, but browsers block ES modules and service workers over
`file://`, so serve it over HTTP. Any static server works, for example:

```bash
python -m http.server 8000   # then open http://localhost:8000
```

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

When updating a deployed app, bump `CACHE_VERSION` in `service-worker.js` so
installed clients fetch the new files instead of the cached copy.

## Installing on a phone

Open the deployed URL in a mobile browser (Chrome on Android), then use the
browser menu's **Install app** / **Add to Home screen** option. The app then
launches full-screen from the home screen and works offline.

## License

Personal project, provided as-is. Not affiliated with the KenKen trademark
holder.
