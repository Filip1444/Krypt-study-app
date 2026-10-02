# Review 1 remediation

Completed on 2026-10-01 against the existing working tree. All twelve findings and the additional maintenance items in [review1.md](review1.md) have been addressed.

## Changes and evidence

| Review item | Resolution | Verification |
| --- | --- | --- |
| 1. Save queue failure | Directory creation is inside the guarded save operation; the queue recovers before subsequent operations. | A filesystem fault test fails one save, restores access, and successfully retries. |
| 2. Competing instances | Electron acquires a single-instance lock before startup. Later launches focus the existing window. | Unit coverage plus a real second Electron process that exits without replacing the active workspace. |
| 3. Failed folder change | Folder changes share the save queue, stage file writes, persist configuration atomically, and commit the active path last. Failed copies/configuration writes clean up their destination files. | Partial-copy and configuration-failure tests verify rollback and a successful subsequent retry. |
| 4. Unsupported runtime and dependencies | Electron upgraded to 44.5.1, electron-builder to 26.15.3, and the lockfile refreshed. Unused docx and its dependencies removed. | Actual Electron interface tests, Windows packaging, and a clean npm security audit. |
| 5. Inherited subject names | Subject collections use maps with a null prototype and collection helpers check own properties. | The interface creates a `toString` subject, edits its note, and restores it after restarting the app. |
| 6. Imported markup | Validation checks review counters, calendar dates, duplicate identities, nested collection values and settings. Retention tooltip HTML is escaped. | Malformed-data unit cases and a real IPC import rejection that preserves the current workspace. |
| 7. Backup precedence | Folder migration selects the first valid modern/legacy backup in that order and retains snapshots. Destinations containing recovery data are rejected. | Backup-content, snapshot-copy, reload-from-configuration, and occupied-destination checks. |
| 8. Selected image persistence | Serialization preserves structural image class tokens and removes selection state and resize handles. | A real editor test inserts, selects, resizes, saves and reopens an image, then selects it again. |
| 9. Underline shortcut | The main process permits Ctrl/Cmd+U through to the editor. | Native keyboard input underlines a note; the formatting survives an app restart. |
| 10. Quick flashcards | Selection, badge activation, Save, Cancel and keyboard actions are wired. Selected question text is retained across focus changes. | Selecting note text, opening the dialog, entering an answer and creating the card through the interface. |
| 11. Calendar dates | Study history, reviews and charts use a shared local calendar-day helper. The open app refreshes daily displays and session counts on day changes. | Local-midnight and daylight-saving cases for Europe/Zagreb and America/New_York. |
| 12. Zero-time completions | Starting a completed timer resets its duration. Completion requires reaching the deadline of an active session. | Controlled-clock interface checks verify completion, restart and pause without extra session credit. |

## Additional maintenance

- **Release checks:** Windows CI uses Node.js 24 and runs both unit and Electron interface suites before building.
- **Closing an unresponsive app:** The renderer installs its flush listener before loading saved data. The main process times out missing acknowledgments and offers Retry, Keep app open, or explicit Close without saving. Tests verify that the recovery prompt does not silently discard edits.
- **Dialog accessibility:** A shared dialog controller sets dialog semantics and accessible titles, moves focus into dialogs, traps Tab/Shift+Tab, makes the background inert, restores focus, and handles Escape for cancellable dialogs. Quick-flashcard fields have explicit labels. The recovery dialog keeps focus until a recovery action succeeds. Interface tests cover focus containment, Escape, Settings focus restoration, and recovery.
- **Timer accuracy:** Remaining time is derived from a deadline rather than interval callback counts. Time continues during computer sleep and completion is processed on resume; pause freezes the remaining duration.
- **Packaging and documentation:** `.bak` source files are excluded from packages. README and technical/introduction documents now describe current dependencies, workspace JSON backup, icons, keyboard behavior and verification commands. The app entry HTML is resolved relative to its source directory.
- **Recovery archives:** Automatic snapshot pruning now targets only automatic `krypt-*.json` snapshots, preserving archived unreadable data.

## Verification results

| Check | Result |
| --- | --- |
| `npm test` | **15 passed, 0 failed** |
| `npm run test:ui` | **9 passed, 0 failed**, using Electron 44.5.1 and disposable data directories |
| `npm audit --json` | **0 reported vulnerabilities**, including development dependencies |
| `git diff --check` | Passed |
| `npm run dist:win -- --config.directories.output=release/review1` | Passed; installer and portable executable created |
| Packaged `app.asar` inspection | Contains current app, schema, preload, study logic, translations and dialog controller; excludes `src/app.js.bak` and development tests |

Windows artifacts are available in `release/review1/`:

- `KRYPT Setup 1.6.1.exe`
- `KRYPT 1.6.1.exe`

## Limits and compatibility

The interface tests exercise the real Electron main process, preload bridge, renderer and filesystem. Native file selection is stubbed where an automated import/restore needs a chosen path. Failure tests inject filesystem faults. All test workspaces are disposable; production user data was not used.

Windows packages were built and inspected; the installer was not installed over the user's application. macOS/Linux packages and assistive-technology output were not tested in this Windows environment. Keyboard behavior and dialog semantics were checked automatically.

Existing historical day keys are preserved because old UTC day keys do not retain the original timestamps needed for an accurate conversion to local days. New activity uses local dates. Structurally invalid backups are now rejected rather than loaded into the interface.

Remediation was initially verified with local version 1.6.1 builds. The fixes are included in [the v1.6.2 release notes](../details/releases/v1.6.2.md); release publishing is handled separately from this verification record.
