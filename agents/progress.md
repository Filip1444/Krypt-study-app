# KRYPT — Project Progress

Use this file as a quick handoff for future work sessions. Update it when features or project state change.

## Current project state

- Desktop app built with Electron; package version is 1.6.2.
- Main interface and feature logic live in `src/index.html`, `src/style.css`, and `src/app.js`; Electron setup and the renderer bridge live in `main.js` and `preload.js`.
- The renderer runs sandboxed with context isolation, Node integration disabled, and a restrictive content security policy.
- App data is stored locally as schema-versioned JSON through the main process, with migration of older files, atomic saves, a recovery copy, and up to 10 dated snapshots.
- Release automation builds Windows packages; local build scripts are defined in `package.json`.

## Features present

- Subject management with saved drag-and-drop and keyboard reordering, plus subject-specific notes, flashcards, tasks, and grades.
- Rich-text note editor with formatting controls, undo/redo, symbols, and image insertion/resizing.
- Editor HTML is sanitized when loaded, pasted, and saved. Font changes to a selection are saved, image insertion preserves the caret across the file picker, and changing subjects saves the open note first.
- Note search, grouping, selection, bulk deletion, rename/move actions, and undo support for deletions.
- Flashcard groups, review sessions, again/got-it ratings, spaced-repetition scheduling, and review statistics.
- Existing flashcards can be edited. Edits keep the review schedule unless the user checks Reset review progress.
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
- Pending changes flush when the app loses focus, is hidden, or closes. Failed saves show a persistent banner with Retry and Open data folder actions; closing after a failed save requires an explicit choice.
- Compact layout at narrow window widths, including a horizontal navigation row, wrapping editor toolbar, and scrollable Kanban board. Minimum window size is 600 × 520.
- Node tests cover migration, save/backup recovery, invalid saves, subject deletion/undo, and flashcard editing and scheduling.

## Useful commands

```bash
npm start
npm test
npm run dist:win
```

## Notes for the next session

- Review 1 remediation upgrades Electron to 44 and electron-builder to 26, removes unused docx, excludes `.bak` sources from distribution, and adds actual Electron interface tests with Playwright.
- Saves recover from transient directory failures. Only one app instance opens, and data-folder migration commits configuration after successful copying, preserves snapshots, and gives modern backups precedence.
- Import validation checks nested counters, dates, IDs and settings; subject maps support inherited-property names safely. Retention tooltip content is escaped.
- Selected images retain structural wrappers after saving; quick flashcard selection and modal controls are wired; Ctrl/Cmd+U reaches the editor.
- Study days use local calendar dates. Timers use deadlines, pause correctly and restart completed sessions; modal dialogs manage focus and isolate the background. Closing an unresponsive renderer offers explicit recovery choices.
- CI runs `npm test` and `npm run test:ui` before building. See the remediation record in `reviews/` for verification results and limits.

- Read `README.md` for setup, build, and user-facing overview.
- Review `agents/ideas.md` for remaining proposals; completed ideas have been removed.
- Keep this file updated with features actually implemented and any known issues or active work.
