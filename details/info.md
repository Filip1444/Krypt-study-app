# KRYPT technical information

## Source layout

| File or directory | Purpose |
| --- | --- |
| `main.js` | Electron lifecycle, one-instance enforcement, IPC, local storage, backup and folder migration |
| `preload.js` | Context-isolated renderer API |
| `data-schema.js` | Workspace validation and legacy migration |
| `src/app.js` | App state and interface behavior |
| `src/study-logic.js` | Flashcard scheduling, local calendar keys, timer calculation and subject operations |
| `src/dialogs.js` | Modal focus, background isolation and keyboard dismissal |
| `src/i18n.js` | English/Croatian interface translation |
| `src/index.html`, `src/style.css` | Interface markup and styling |

## Runtime and commands

Use Node.js 24 or newer. The app uses Electron 44 and electron-builder 26; exact versions are locked in `package-lock.json`. Export is complete-workspace JSON. No DOCX library is required.

```sh
npm ci
npx --no install-electron
npm start
```

The Electron download command prepares an offline development environment. The Windows CI workflow installs dependencies before packaging.

| Command | Output directory |
| --- | --- |
| `npm run dist:win` | `release/` — NSIS installer and portable executable |
| `npm run dist:linux` | `release_linux/` — AppImage and Debian package |
| `npm run dist:mac` | `release_macOS/` — DMG |

Build on the target platform for release verification. Windows builds are configured for unsigned distribution; macOS signing/notarization requires separately supplied credentials. Backup source files (`*.bak`) are excluded from app packages.

## Local storage

The default `krypt-data.json` location is Electron's per-user application data directory, normally `%APPDATA%\krypt\` on Windows, `~/Library/Application Support/krypt/` on macOS, and `~/.config/krypt/` on Linux. Settings displays the active directory and allows changing it.

Saves replace the primary file atomically, keep a recovery copy, and retain ten recent automatic snapshots in `backups/`. Unreadable-file archives are preserved separately from snapshot rotation. Folder changes copy the readable workspace, prefer the valid modern recovery backup over a legacy backup, retain snapshots, and commit the new configuration atomically. A failed migration leaves the original directory active.

Study history and review dates use local calendar days. Historical day keys are preserved when loading existing workspaces because the original timestamps needed to reinterpret old UTC keys are unavailable.

Timer time continues while the computer is asleep; completion is processed on resume. Pausing freezes the displayed remaining time. Restarting a completed timer begins a new full-duration session.

## Icons and shortcuts

`assets/icon.ico` supplies the Windows app and installer icon. `icon.png` is the source icon for macOS/Linux packaging.

| Shortcut | Action |
| --- | --- |
| Ctrl/Cmd+S | Flush the current note to disk |
| Ctrl/Cmd+N | New note or flashcard on the corresponding page |
| Ctrl/Cmd+B / I / U | Bold, italic, underline in the editor |
| Ctrl/Cmd+Z / Y | Undo/redo in the editor |
| Space, then 1 or 2 | Flip and rate a flashcard |
| Tab / Shift+Tab | Move within the open dialog |
| Escape | Dismiss a cancellable dialog |

The unreadable-data recovery dialog stays open until a recovery action succeeds. DevTools are disabled in the app window.
