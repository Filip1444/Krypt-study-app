# KRYPT

KRYPT is an offline-first desktop study app for organizing notes and study work. It is built with Electron and stores its data locally on your computer.

## Features

- Organize notes, flashcards, tasks, grades, and scheduled tests by subject. Drag a subject's handle in the sidebar to reorder it, or focus the handle and use the arrow keys; the order is saved. Grades use a selectable letter or numeric system, with an optional percentage for each entry.
- Write and format rich-text notes, insert and resize images, and export notes as TXT, HTML, or DOCX.
- Review flashcards with spaced repetition and track review history.
- Plan work with a task list or Kanban board, recurring tasks, and a Pomodoro timer.
- Track study streaks, progress, grade averages, and upcoming tests.
- Customize the theme, accent color, sidebar width, and interface language (English or Croatian).
- Automatically save data locally and keep a recovery copy plus up to 10 dated snapshots.
- Create or restore complete-workspace JSON backups from Settings; open or change the active data folder there.
- Recover from unreadable data with a restore flow that preserves the damaged files.

## Requirements

- Node.js and npm
- Windows for the packaged release

## Run from source

```bash
npm install
npm start
```

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
- `preload.js` — narrow API bridge exposed to the renderer
- `src/` — app interface, styling, and renderer logic
- `assets/` — packaged app assets
- `details/` — additional app and technical notes

## Tech stack

Electron 29, vanilla HTML/CSS/JavaScript, `docx` for Word export, and `electron-builder` for packaging.
