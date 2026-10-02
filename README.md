# KRYPT

KRYPT is an offline-first desktop study app for organizing notes and study work. It is built with Electron and stores its data locally on your computer.

## Features

- Organize notes, flashcards, tasks, grades, and scheduled tests by subject. Drag a subject's handle in the sidebar to reorder it, or focus the handle and use the arrow keys; the order is saved. Grades use a selectable letter or numeric system, with an optional percentage for each entry.
- Write and format rich-text notes, and insert and resize images.
- Select text in a note to create a flashcard directly from the selection.
- Review flashcards with spaced repetition, track review history, and edit cards while keeping or resetting their review progress.
- Plan work with a task list or Kanban board, recurring tasks, and a Pomodoro timer.
- Timer countdowns use elapsed time, including time spent asleep; completion is recorded when the app resumes. Starting a completed timer begins a full new session. Session counts reset at local midnight.
- Track study streaks, progress, grade averages, and upcoming tests.
- Customize the theme, accent color, sidebar width, and interface language (English or Croatian).
- Automatically save versioned data locally and keep a recovery copy plus up to 10 dated snapshots. Pending edits are flushed when the app closes or loses focus; a failed save stays visible with retry and data-folder actions.
- Create or restore complete-workspace JSON backups from Settings; open or change the active data folder there.
- Recover from unreadable data with a restore flow that preserves the damaged files.
- Opening KRYPT again focuses the existing instance, protecting the workspace from conflicting saves. Folder changes preserve valid recovery copies and snapshots and take effect only after copying succeeds.
- Dialogs support keyboard focus containment, focus restoration, and Escape dismissal where cancellation is safe.
- Use a compact layout in a 600 × 520 window, with a wrapping note toolbar and scrollable Kanban board.

## Requirements

- Node.js 24 or newer and npm
- Windows for the packaged release

## Run from source

```bash
npm ci
npm start
```

Run data and study-logic checks with `npm test`, and Electron interface checks with `npm run test:ui`. Interface tests use hidden windows and disposable data folders. The first development launch or interface test may download the Electron binary; `npx --no install-electron` can download it in advance. CI runs both test suites before packaging.

## Build

```bash
npm run dist:win
```

Windows installer and portable build artifacts are written to `release/`.

## Data and privacy

KRYPT saves app data as `krypt-data.json` in Electron's per-user application data directory by default. On Windows this is typically `%APPDATA%\\krypt\\`; on Linux it is typically `~/.config/krypt/`. Settings can show or change the data folder. Backups and snapshots are stored locally. The app is designed to work offline and does not require an account.

## Keyboard shortcuts

Keyboard shortcuts are listed in Settings.

## Project layout

- `main.js` — Electron main process and local data persistence
- `data-schema.js` — saved-data validation and migrations
- `preload.js` — narrow API bridge exposed to the renderer
- `src/` — app interface, styling, and renderer logic
- `assets/` — packaged app assets
- `details/` — additional app and technical notes
- `agents/` — project progress and improvement ideas
- `tests/` — focused automated checks

## Tech stack

Electron 44, vanilla HTML/CSS/JavaScript, and `electron-builder` 26 for packaging. See `package-lock.json` for the exact installed versions.
