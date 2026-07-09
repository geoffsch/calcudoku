# CLAUDE.md — Calcudoku project notes

Project-specific guidance for working in this repo. (User-level preferences live
in the global `~/CLAUDE.md`.)

## What this is
A personal, offline **Calcudoku PWA** for Android (Calcudoku is the trademark-free
name for the puzzle also sold as "KenKen"). Generate-and-play, with
pencil-mark "maybe values". The **source is published to a public GitHub repo**
(so the README is written for a general audience), but there is no intent to ship
to an app store or monetise.

Author-specific context (experience level, how much to explain) lives in a local,
git-ignored file imported at the end of this document.

## Canonical state
Plans live in the git-ignored `plans/` directory (private; not in the public
repo):
- `plans/BACKLOG.md` — one-line ideas not yet fleshed out. Promote an item to its
  own `plans/<feature>.md` when you start working it, and delete the backlog line.
- `plans/<feature>.md` — an active plan. Read it before resuming work; tick
  checkboxes and record actual outcomes as you go.
- `plans/<feature>.done.md` — a completed plan (renamed with the `.done.md`
  suffix). The v1 build is recorded in `plans/v1-build.done.md`.

## Why this stack (rationale)
Chosen for lowest friction to get a single-purpose puzzle game onto an Android
phone, given no prior mobile experience:
- A **PWA** installs from a URL via "Add to Home Screen" and runs offline — no
  Android Studio/SDK, no APK build, no signing, no app-store process.
- **Vanilla JS + no build step** means the app is just static files that deploy
  to any static host (GitHub Pages) and need no toolchain to run or serve.
- The alternative considered was **Flutter** (a real native app, but requires
  learning Dart and a large toolchain). It remains a possible future direction —
  the DOM-free `src/game/**` logic would port across. Tracked in PLAN.md Phase 5.

## Tech decisions (don't quietly reverse these)
- **PWA, vanilla JavaScript, ES modules, NO build step.** The app must remain a
  set of static files that can be served as-is and deployed to GitHub Pages. Do
  not introduce a bundler, framework, or TypeScript without discussing it first
  (all are noted as *optional later* upgrades, not defaults).
- **No runtime dependencies.** The shipped app pulls in no third-party JS. Dev
  dependencies (test/serve tooling) are fine but keep them minimal.
- **`src/game/**` is DOM-free and pure.** All puzzle logic (generator, solver,
  cages, model) must run in plain Node with no browser APIs, so it stays
  unit-testable. Keep DOM/browser concerns in `src/ui/**` and `src/state/**`.

## Conventions
- ES modules everywhere (`import`/`export`), `.js` extensions in import paths
  (required for native browser modules — no resolver).
- Tests use Node's built-in runner: `node --test`. Add tests for game logic,
  especially the **unique-solution guarantee**.
- Keep functions pure where practical; isolate state and side effects.

## Domain quick-reference (Calcudoku)
- `N×N` grid filled with values `1..N`; every row and column is a permutation
  (a Latin square).
- Grid is divided into **cages** (contiguous cell groups), each with a target
  and an operation:
  - `+` sum, `*` product — any cage size.
  - `-` difference `|a−b|`, `/` quotient (exact) — **2-cell cages only**.
  - single-cell cage = a given (value shown directly).
- A valid puzzle has **exactly one** solution — the generator must verify this
  with the solver before returning a puzzle.

## Working style for this repo
- Flag any deviation from the tech decisions above before acting (per global
  CLAUDE.md plan discipline).
- Ensure you update README.md as you build to ensure it accurately reflects the
  status and structure of the repo. Do this in the same commit as making the change,
  not in a dedicated follow-up.
- Level of explanation to assume: see the imported author context below.

<!-- Local, git-ignored author context. Absent on fresh clones (import is
     skipped silently); present on the author's machine. -->
@AUTHOR.local.md
