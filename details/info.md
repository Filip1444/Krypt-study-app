# Study App — Technical Info

## Project Structure

```
study_app/
├── main.js            # Electron main process
├── package.json       # Project config & build settings
├── icon.png           # App icon (source PNG)
├── src/
│   ├── index.html     # App UI entry point
│   ├── app.js         # Renderer-process logic
│   └── style.css      # Global styles
├── release/           # Windows build output
├── release_macOS/     # macOS build output
└── details/
    ├── intro.md       # App introduction
    └── info.md        # This file — technical details
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Shell | [Electron](https://www.electronjs.org/) v29 |
| UI | Vanilla HTML + CSS + JavaScript |
| Export | [docx](https://www.npmjs.com/package/docx) v9 |
| Bundler | [electron-builder](https://www.electron.build/) v25 |

## Build & Run

### Development

```bash
npm start
```

### Build for Windows

```bash
npm run dist:win
```
Output goes to `release/`.

### Build for macOS

```bash
npm run dist:mac
```
Output goes to `release_macOS/`.

## Data Storage

User data (subjects, notes) is persisted as JSON in the OS user-data directory:

| Platform | Path |
|----------|------|
| Windows  | `%APPDATA%\study-app\studyapp-data.json` |
| macOS    | `~/Library/Application Support/study-app/studyapp-data.json` |

## Icon Files

| File | Used For |
|------|---------|
| `icon.png` | Source image (used by electron-builder for macOS `.icns`) |
| `release/.icon-ico/icon.ico` | Windows taskbar / titlebar / installer icon |

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+I` | Toggle DevTools |

## Version History

| Version | Notes |
|---------|-------|
| 1.0.0 BETA | Initial release (Windows) |
| 1.0.0 | Stable Windows release + macOS build |
