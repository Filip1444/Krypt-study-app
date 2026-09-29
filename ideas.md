# KRYPT — Improvement Ideas

Ideas remain ordered from most urgent to least urgent across all areas. Items marked **Implemented** have been completed; the rest are proposals.

1. **Implemented — Protect the renderer from untrusted content.** Electron runs with Node integration disabled, context isolation and sandboxing enabled, and a narrow preload bridge. A content security policy blocks inline scripts; user text is escaped and saved rich-text notes are sanitized before display.
2. **Implemented — Make load failures visible and recoverable.** KRYPT distinguishes an empty workspace from unreadable files, offers explicit restore or fresh-start choices, and blocks normal writes until the user chooses. It reports backup recovery and preserves unreadable files before replacement.
3. **Implemented — Strengthen backup and restore.** Settings now provide full-workspace JSON export/import, restore from JSON and backup files, access to the data folder, and a way to choose an empty data folder. KRYPT keeps up to 10 recent dated automatic snapshots.
4. **Version saved data and migrate older formats safely.** Define a schema version and migrations as the app changes.
5. **Make pending saves reliable.** Flush edits when closing or switching away from the app, and show a persistent, actionable error when a save fails. Avoid losing the last change during the current 600 ms save delay.
6. **Add focused automated checks for critical flows.** Cover loading, saving, backup recovery, migrations, subject deletion and undo, note export, and flashcard scheduling.
7. **Improve keyboard and screen-reader access.** Make dialogs, context menus, editor controls, and Kanban movement usable without a mouse; add labels and visible focus states.
8. **Add due-date views and reminders.** Bring upcoming tasks, tests, and flashcard reviews into one view, with optional local reminders.
9. **Let users edit existing flashcards.** Support changing a card's front, back, and group, with clear choices about whether edits reset its review schedule.
10. **Add tags and search across subjects.** Search notes, tasks, and flashcards together, with filters for type, subject, and tag.
11. **Offer more flashcard scheduling controls.** Let users tune review intervals and see why a card is due, while keeping sensible defaults.
12. **Make study trends more flexible.** Let users set goals and inspect review, streak, and completion trends over custom date ranges.
13. **Link related study material.** Allow notes to reference other notes, flashcards, and tasks.
14. **Improve first-use guidance.** Add a short onboarding flow and an optional sample workspace.
15. **Support smaller screens.** Provide a compact layout and check that dialogs and the note editor remain usable at the minimum window size.
16. **Expand localization and date/time preferences.** English and Croatian are available; add more languages and let users choose date format and 12- or 24-hour clock.
17. **Document releases for each platform.** Record Windows and macOS build requirements, signing steps, and a repeatable release checklist.
18. **Show app version and changes.** Add an About screen and a concise changelog.
