# KRYPT — Project Progress

Use this file as a quick handoff for future work sessions. Update it when features or project state change.

## Current project state

- Desktop app built with Electron; package version is 1.6.1.
- Main interface and feature logic live in `src/index.html`, `src/style.css`, and `src/app.js`; Electron setup and the renderer bridge live in `main.js` and `preload.js`.
- The renderer runs sandboxed with context isolation, Node integration disabled, and a restrictive content security policy.
- App data is stored locally as JSON through the main process, with atomic saves, a recovery copy, and up to 10 dated snapshots.
- Release automation builds Windows packages; local build scripts are defined in `package.json`.

## Features present

- Subject management with saved drag-and-drop and keyboard reordering, plus subject-specific notes, flashcards, tasks, and grades.
- Rich-text note editor with formatting controls, undo/redo, symbols, image insertion/resizing, and TXT/HTML/DOCX export.
- Note search, grouping, selection, bulk deletion, rename/move actions, and undo support for deletions.
- Flashcard groups, review sessions, again/got-it ratings, spaced-repetition scheduling, and review statistics.
- Task list and Kanban views, task status movement, recurring task options, and per-subject task lists.
- Pomodoro-style study timer with selectable modes, progress display, and completion sound.
- Scheduled tests, date countdowns, dashboard summaries, and upcoming-item badge.
- Grade tracking with required grades, optional percentages, five grading systems, and system-aware averages, targets, and performance summaries. Grade values in the Grades tab use a consistent red-to-green scale (F to A, or worst to best for numeric systems), including entries and summary values; target status uses the displayed rounded grade so an average of 4.5 that displays as 5 meets a target of 5.
- Study streak tracking, milestones, retention chart, and recent-activity heatmap.
- Theme/accent customization, adjustable sidebar width, focus mode, and shortcuts listed in Settings.
- Short subject-reorder and dialog animations, with reduced-motion support.
- Saved English/Croatian interface setting, with localized labels, dates, and backup dialogs.
- Settings for complete-data JSON backup/export, restore/import, opening the active data folder, and choosing an empty data folder.
- Recovery screen for unreadable data, backup recovery notice, and an explicit fresh-workspace option that preserves unreadable files.

## Useful commands

```bash
npm start
npm run dist:win
```

## Notes for the next session

- Read `README.md` for setup, build, and user-facing overview.
- Review `ideas.md` for remaining proposals; items marked Implemented are complete.
- Keep this file updated with features actually implemented and any known issues or active work.
