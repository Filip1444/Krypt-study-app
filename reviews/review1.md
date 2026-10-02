# KRYPT codebase review 1

**Remediation:** The findings below describe the original audited code. See [review1-fixes.md](review1-fixes.md) for the completed fixes and verification results.

**Date:** 2026-10-01
**Scope:** Current working tree, including existing uncommitted changes and new source/test files. Git HEAD: `1bf3bbe` (`Release 1.6.1 for Windows`). Package version: `1.6.1`.

## Assessment

The app has useful security and recovery foundations: a sandboxed renderer, context isolation, disabled Node integration, a narrow preload bridge, a content security policy, note sanitization, schema versioning, atomic file replacement, and recovery backups. However, persistence still has paths that can lose changes or prevent all subsequent saves. Those problems should be addressed before another release.

This review identifies **12 findings: 4 high priority and 8 medium priority**. Priority describes the impact and urgency in this app; dependency advisory severities are reported separately. No demonstrated remote code execution is claimed.

## Validation and limits

- `npm.cmd test`: **5 tests passed, 0 failed**.
- `node --check`: passed for `main.js`, `preload.js`, `data-schema.js`, all three renderer JavaScript files, and both test files.
- Isolated Node VM checks reproduced six persistence/schema problems: a permanently rejected save queue, lost changes across two instances, failed folder switching without rollback, replacement of the modern backup by the legacy backup, inherited subject keys, and imported markup reaching the retention chart's HTML.
- Additional isolated checks reproduced counting completed sessions at zero time and UTC day assignment. A synthetic DOM check exercised removal of a selected image's wrapper class.
- `npm.cmd ls --depth=0`: installed direct versions are Electron `29.4.6`, electron-builder `25.1.8`, and docx `9.6.1`.
- `npm.cmd audit --json`: **23 affected packages: 1 critical, 21 high, 1 low**. These counts include transitive packages and propagated dependency findings; they are not a count of independently exploitable app vulnerabilities. The first sandboxed request failed; the authorized network retry returned the report.
- Reviewed source, markup, styles, packaging, release workflow, tests, and documentation. No production user data was accessed or changed. Reproductions used temporary directories that were removed afterward.
- No packaged Electron application, installer, real browser editor session, screen reader, or cross-platform build was exercised. Electron APIs and renderer DOM operations were mocked where stated. The existing tests also mock Electron; passing them does not establish that the full app works correctly.

## Findings

### 1. High — One directory error permanently prevents subsequent saves

**Location:** [main.js](../main.js), lines 68–104, especially 70–74.

`ensureDataDirectory()` executes inside the queued callback but outside its `try` block. If it throws, `saveQueue` becomes rejected. Every later save attaches only a success callback with `.then(...)`, so none of those callbacks runs, even after permissions or directory availability have been restored. The renderer's Retry action cannot recover this queue.

**Reproduction:** Inject a single `mkdirSync` failure, call the save handler, remove the injected failure, and call it again. Both calls reject. Confirmed using the actual main-process source with a filesystem fault injected in an isolated VM.

**Impact:** Pending changes remain unsaved for the rest of that process's lifetime. Restarting can discard those changes.

**Recommendation:** Put directory creation and path preparation inside the guarded save operation. Ensure the queue recovers from rejection before accepting subsequent work, while still reporting each failed operation. Add a regression check that a second save succeeds after a transient directory failure.

### 2. High — Multiple app instances silently overwrite each other's changes

**Location:** [main.js](../main.js), lines 29–50, 68–104, and 233–237.

Each process loads a full workspace into memory and later replaces the entire data file. There is no single-instance lock, file lock, or saved-version conflict check. The promise queue serializes saves only within one process.

**Reproduction:** Start two instances with the same workspace. In instance A, edit a note and let it save. In instance B, add a task. B writes its old note content along with its new task, overwriting A's edit. This sequence was reproduced with two independent main-process VM contexts sharing a temporary folder.

**Impact:** Ordinary use of two windows/processes causes silent loss of changes. Simultaneous writes also share the same `.tmp` pathname.

**Recommendation:** Acquire an Electron single-instance lock before opening a window and focus the existing instance on subsequent launches. If multiple processes are intentionally supported, use a lock and a version/conflict protocol for each data directory.

### 3. High — A failed folder change leaves the active directory changed

**Location:** [main.js](../main.js), lines 145–164, especially 154–163; [src/app.js](../src/app.js), lines 427–438.

`chooseDataDirectory()` assigns the global `dataDirectory` before directory creation, file copying, and configuration writing succeed. Errors reject the IPC call without restoring the previous directory. Subsequent saves therefore target the new folder, although the UI did not report success and the saved configuration may still point at the old folder.

**Reproduction:** Choose a new directory and inject a failure in `copyFileSync`. The chooser rejects, but `krypt:get-directory` returns the new directory. Confirmed with the main-process source and a temporary workspace.

**Impact:** Data can split between folders. If a later save succeeds in the new folder while configuration still points to the old one, restarting loads stale data.

**Recommendation:** Prepare the destination and persist configuration successfully before committing the global directory change. On failure, retain the original directory and return a structured error. Coordinate this operation with saves and use atomic configuration replacement.

### 4. High — The shipped Electron runtime is long out of support

**Location:** [package.json](../package.json), lines 54–59; [package-lock.json](../package-lock.json), Electron entry beginning at line 2290.

The dependency range is `electron: ^29.0.0`, and the installed and locked version is `29.4.6`. The range cannot move to a supported major through an ordinary patch/minor dependency update. Electron 29 reached end of life on **2024-08-19**, according to the [official release schedule](https://releases.electronjs.org/schedule). Electron supports its latest three stable majors, as documented in its [release policy](https://www.electronjs.org/docs/latest/tutorial/electron-timelines).

**Impact:** The distributed application continues to use an unsupported Chromium/Electron runtime while processing pasted HTML, imported workspaces, and images. The existing sandbox and CSP reduce exposure but do not supply missing runtime patches. This review did not demonstrate exploitation of a specific Electron advisory.

**Recommendation:** Upgrade to a supported Electron release, update the lockfile, and verify the preload bridge, dialogs, close/save behavior, editor, and Windows packaging. Electron's [security guidance](https://www.electronjs.org/docs/latest/tutorial/security) recommends keeping the runtime current.

The dependency audit also warrants remediation: `tar@6.2.1` is in the builder chain, `extract-zip@2.0.1` is in the Electron installation chain, and `nanoid@5.1.7` is pulled in by docx. The first two are tooling dependencies; docx is a production dependency but has no use in the active source. The audit suggested a major electron-builder upgrade for several tooling findings. Relevant reported advisories include [tar resource exhaustion](https://github.com/advisories/GHSA-23hp-3jrh-7fpw), [extract-zip archive writes](https://github.com/advisories/GHSA-7pqw-9j4j-h8q3), and [nanoid integer handling](https://github.com/advisories/GHSA-xwg4-73v4-xw9w). Refresh these dependencies, remove unused docx if appropriate, and assess reachable use before treating advisory severity as application exploitability.

### 5. Medium — Accepted subject names collide with inherited object properties

**Location:** [src/app.js](../src/app.js), lines 187–198, 939–954, and 957–968; [data-schema.js](../data-schema.js), lines 15–25.

Subject maps are ordinary `{}` objects. Collection helpers test `data.notes[subject]` and similar properties for truthiness instead of checking whether the key belongs to the map. Only three names are reserved, so names such as `toString`, `valueOf`, and `hasOwnProperty` are accepted but can resolve to inherited functions.

**Reproduction:** A workspace with `subjects: ['toString']` and empty collection maps passes `validData()`. In the renderer, `getFiles('toString')` returns a function, and `.push()` throws. Other collection rendering also assumes arrays and can fail during startup.

**Impact:** Adding, renaming, or importing one of these subjects can break navigation and make a saved workspace fail to initialize.

**Recommendation:** Use maps with a null prototype or own-property checks consistently for every subject collection. Validate unique subject names and collection shapes. Prefer structurally safe map access over continually extending a reserved-name list.

### 6. Medium — Imported review counters can inject HTML into the progress page

**Location:** [data-schema.js](../data-schema.js), line 25; [main.js](../main.js), lines 139–142; [src/app.js](../src/app.js), lines 2175–2185.

Validation requires only that `reviewLog` be an object; its daily counters are not validated. `renderRetentionChart()` interpolates `log.correct` and `log.total` directly into a quoted `title` attribute in an `innerHTML` assignment.

**Reproduction:** In an otherwise valid backup, set today's log to `total: 1` and `correct: '\"><div id="audit-injected">Injected</div><div data-x="'`. `validData()` accepts it, and the generated chart HTML contains the injected `div`. Confirmed by exercising the renderer function in a VM and inspecting the assigned HTML.

**Impact:** Opening Progress after importing a crafted workspace can inject arbitrary markup and spoof or disrupt the interface. The CSP blocks ordinary inline scripts; this finding demonstrates HTML injection, not script execution or a sandbox escape.

**Recommendation:** Validate counters as finite nonnegative integers with `correct <= total`, and validate day keys. Construct chart nodes through DOM APIs and assign the tooltip with `.title`, or escape all interpolated attribute content. Audit other imported nested values for the same assumption.

### 7. Medium — Folder migration overwrites the modern backup with the legacy backup

**Location:** [main.js](../main.js), lines 156–161.

The loop copies `.backup` and then `.backup.json` to the same destination `.backup` file. When both exist, the legacy copy always wins. Normal saves can create the modern backup while leaving a legacy file in place, making this a realistic migration path.

**Reproduction:** Put different contents in the modern and legacy backups, change the data folder, and inspect the new modern backup. Its content matches the legacy file. Confirmed against the main-process source.

**Impact:** Recovery can restore older data even though a newer valid backup existed. The chooser also checks only for an existing destination primary file, allowing backup files belonging to another workspace to be overwritten.

**Recommendation:** Prefer the validated modern backup, use the legacy backup only as a fallback, and check all destination workspace files before copying. Preserve filenames or make the precedence explicit.

### 8. Medium — Saving a selected image removes its structural wrapper class

**Location:** [src/app.js](../src/app.js), lines 158, 1284–1290, 2595–2608, and 2641–2645.

Selecting an image adds `img-selected` to its wrapper. The sanitizer preserves a `DIV` class only when the entire attribute equals `img-wrap` or `img-inner`. It therefore strips `class="img-wrap img-selected"` during a save, including the save triggered when resizing ends.

**Reproduction:** Insert an image, select and resize it, then reopen the note. The sanitizer's selected-wrapper branch was reproduced with a synthetic DOM; a real editor restart test remains needed.

**Impact:** The saved image loses the wrapper recognized by `.closest('.img-wrap')`, breaking later selection/resizing and wrapper-specific layout or alignment behavior.

**Recommendation:** Preserve approved structural class tokens independently of transient selection tokens. Remove editor-only controls from serialized content. Verify insert → select → resize → save → reopen in a real editor.

### 9. Medium — The main process blocks the documented underline shortcut

**Location:** [main.js](../main.js), lines 193–197; [src/app.js](../src/app.js), lines 797–804; [src/index.html](../src/index.html), shortcut list.

The main-process `before-input-event` handler prevents every command-modified `u` input. The renderer uses the same combination for underline, and Settings advertises it.

**Trigger:** Focus the note editor, select text, and press Ctrl+U on Windows or Command+U on macOS.

**Impact:** The renderer's underline handler cannot receive the blocked input. This is established by source inspection; native keyboard behavior was not exercised.

**Recommendation:** Let the editor receive its advertised formatting shortcut. DevTools are already disabled in window preferences; avoid broadly intercepting ordinary editing commands.

### 10. Medium — Quick flashcard creation has no event wiring

**Location:** [src/app.js](../src/app.js), lines 562–580 and 1352–1449; [src/index.html](../src/index.html), lines 185–208.

The interface contains a selection badge and quick flashcard modal, and functions exist to show, save, and close them. However, `handleNoteSelection`, `openQuickFlashcardModal`, `saveQuickFlashcard`, and `closeQuickFlashcardModal` have no event registrations or calls from active UI handlers.

**Trigger:** Select a short passage in a note. The hidden Make Flashcard badge is never activated. The modal's Save and Cancel controls also lack handlers.

**Impact:** The feature is unreachable through normal use. Confirmed by searching the complete active source and reviewing initialization.

**Recommendation:** Wire selection updates, badge activation, Save, Cancel, and keyboard dismissal, or remove the unfinished interface. Add a check that selecting note text creates a card in the intended subject.

### 11. Medium — Study days use UTC while the displayed calendar uses local time

**Location:** [src/app.js](../src/app.js), lines 115, 201–234, 2092–2096, 2144–2168, and 1854–1856.

Study and review day keys come from `toISOString().slice(0, 10)`, which is UTC. The visible date and schedule use local time. Heatmap and retention dates mix local date arithmetic with UTC serialization.

**Reproduction:** At `2026-10-01 00:30` in Europe/Zagreb, the instant is `2026-09-30T22:30:00Z`. `todayStr()` returns `2026-09-30` even though the interface's local calendar day is October 1. Confirmed using a fixed date in the renderer VM.

**Impact:** Study credit and reviews can land on the previous day, and streak/heatmap transitions occur at the wrong local hour. Daylight-saving transitions can further complicate yesterday calculations.

**Recommendation:** Generate day keys from local year, month, and day consistently. Centralize calendar operations and cover midnight plus daylight-saving transitions in the supported time zones.

### 12. Medium — Restarting the timer at zero records unearned completions

**Location:** [src/app.js](../src/app.js), lines 1750–1773.

After completion, `timerSeconds` remains zero and Start remains available. Pressing Start again runs the completion branch on its first interval callback, increments `sessions`, and calls `markGoalAchieved()` for Pomodoro mode.

**Reproduction:** Finish a session, press Start without Reset, and wait one tick. A second session is counted immediately. Confirmed with captured interval callbacks in the renderer VM. Leaving the zeroed timer open across midnight can award the next day's study goal without a new study session.

**Recommendation:** Reset a completed timer when starting it or disable Start until Reset. Award completion only for a session that actually transitioned from a positive remaining duration to zero.

## Additional maintenance and coverage observations

- **Release checks:** [The build workflow](../.github/workflows/build.yml), lines 24–28, installs dependencies and builds without running `npm test`. Add tests before packaging. The current five tests omit directory migration failures, retries, multiple instances, renderer initialization, sanitization, and UI interactions.
- **Close robustness:** [main.js](../main.js), lines 180–187, waits indefinitely for a renderer flush acknowledgment. The renderer registers its callback only after loading and initial rendering, at [src/app.js](../src/app.js), line 445. A startup exception or crashed renderer can leave normal Close waiting indefinitely. Add explicit handling for renderer failure and a recovery choice that does not silently discard pending edits.
- **Dialog accessibility:** Most custom dialogs lack focus trapping, consistent initial focus, focus restoration, and keyboard dismissal. The confirmation dialog only toggles visibility. Test dialogs with keyboard navigation and a screen reader, including the unreadable-data recovery flow.
- **Timer accuracy:** Countdown uses callback counts instead of elapsed time. Delayed callbacks after suspension or background throttling can extend a session. Use a clock-based deadline and define what sleep/resume should do.
- **Packaging and documentation:** The broad `src/**/*` packaging rule includes `src/app.js.bak`, an obsolete implementation. The `details/` documents still describe individual TXT/HTML/DOCX export and an old icon path, while the active app exposes workspace JSON export. Remove the backup source from distribution and align the documentation with current behavior.

## Suggested repair order

1. Restore reliable saving: recover the save queue, prevent conflicting processes, and make folder migration transactional.
2. Upgrade the Electron runtime and build dependencies; reassess the dependency audit and remove unused production packages.
3. Tighten import validation and collection access, then repair backup precedence and selected-image persistence.
4. Fix shortcut/event wiring, local calendar keys, and timer completion behavior.
5. Make these cases regression checks and run them before packaging releases.

The review adds documentation only. Existing application code and pre-existing working-tree changes were preserved.
