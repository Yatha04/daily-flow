# CLAUDE.md

Shared context for this project. Every agent reads this. Single source of truth — change rules here, not in individual agent prompts.

## Project

A Tauri 2 desktop focus widget for Windows: a translucent, frameless overlay that sits on the desktop, behind other windows but still clickable. Three modules:

1. **Daily to-dos** — completed items are swept at day rollover; unfinished ones carry to the next day.
2. **Notes** — a freeform thoughts scratchpad, autosaved to disk.
3. **Stopwatch** — a small always-visible timer with start / pause-resume / stop-reset.

To-dos and Notes are switchable tabs (one visible at a time). The stopwatch is always visible, small and glanceable, regardless of tab.

React + TypeScript frontend, Rust backend. Phase 1 (window shell) is complete.

## Stack

- Tauri 2
- Frontend: React + TypeScript — `src/`
- Backend: Rust — `src-tauri/`
- Target: Windows only

## Layout

```
src/
  App.tsx              tab state, persistent stopwatch mount, rollover check on launch + focus
  components/
    TabBar.tsx         To-dos | Notes switcher
    Stopwatch.tsx      always-visible mini timer
    TodoView.tsx       list + add (TaskList / TaskRow / AddTaskInput beneath it)
    NotesView.tsx      textarea, autosave
  lib/
    api.ts             typed invoke() wrappers — the ONLY place invoke is called
    types.ts           TS types (must match Rust structs)
  styles.css
src-tauri/
  src/
    main.rs            app setup, plugin registration
    window.rs          HWND styles, z-order  (Phase 1 — done)
    storage.rs         atomic read/write commands (window, tasks, notes)
  tauri.conf.json
  capabilities/        command + plugin permissions
```

## Data model

**Files in `app_data_dir()`** (never next to the exe):

- `window.json` — window position/size (Phase 1, done).
- `settings.json` — `{ lastSeenDate: "YYYY-MM-DD", activeTab: "todos" | "notes" }`.
- `tasks.json` — the to-do array.
- `notes.md` — freeform notes, plain markdown.
- `completed-log.md` — append-only; swept completed tasks are logged here under a dated heading before deletion.

**Task** — TS type and Rust struct must match exactly (`serde(rename_all = "camelCase")`). Mismatch corrupts data silently and is a critical bug.

```ts
interface Task {
  id: string;         // nanoid
  text: string;
  done: boolean;
  createdAt: number;   // epoch ms
  order: number;       // manual sort order
}
```

**Notes** is plain text, not a struct. **Stopwatch is in-memory only** — never persisted, no file. State `{ startedAt: number | null, accumulatedMs: number, running: boolean }` lives in React; it is intentionally lost if the app is quit.

## Hard rules — do not violate

- **Daily rollover is lazy.** On launch AND on window focus, compare today's local date to `settings.lastSeenDate`. If different: append completed tasks to `completed-log.md` under a dated heading, delete completed tasks from `tasks.json`, update `lastSeenDate`. Never a midnight timer or `setInterval` — the app is not reliably running at midnight.
- **Stopwatch is timestamp-based.** `elapsed = now − startedAt + accumulatedMs`. Never a per-second counter (it drifts and breaks when backgrounded or asleep). Pause stores accumulated and clears `startedAt`; resume sets a new `startedAt`; stop zeroes everything.
- **Notes autosave**, plain `.md`, debounced ~300ms, via the atomic Rust write. No save button.
- **Persistence flow:** React holds state → debounce ~300ms → Rust command writes atomically (temp file + rename). React never writes app-data files. `localStorage` is never the source of truth.
- **Capabilities:** every new/renamed command and every plugin goes into `src-tauri/capabilities/` in the same change. Missing = silent failure.
- **Window:** bottom-of-z-order with `WS_EX_NOACTIVATE` + `WS_EX_TOOLWINDOW`. Never parent to WorkerW/Progman.
- **Drag:** only a dedicated strip / explicit padding carries `data-tauri-drag-region`. Never a parent wrapping interactive children.
- **Transparency:** every text element gets a scrim or shadow. Not optional.
- **Tabs:** only the active view (TodoView or NotesView) is mounted/visible; the stopwatch stays mounted across both. `activeTab` persists in settings.
- **Always-running:** clean up every effect, listener, event subscription, and timer on unmount. No polling loops. No leaks.
- **Rust:** no `unwrap()` / `expect()` / `panic!` in command handlers. Validate all input crossing from the frontend.
- **Versioned APIs:** verify version-sensitive Tauri/crate/plugin signatures against current docs. Do not assert from memory.

## Build discipline

Each phase has one testable success criterion. Stop and verify on real Windows before the next phase. One commit + tag per completed phase.

1. Window shell — translucent, behind windows, draggable, position persists  **(done)**
2. Layout shell — tab switcher (To-dos / Notes) + persistent mini-stopwatch region, placeholder content, active tab persists
3. To-do module — list, add, complete, delete, reorder (in memory)
4. To-do persistence + daily rollover — atomic write, `lastSeenDate`, sweep-and-log on launch + focus
5. Notes module — textarea view, debounced atomic autosave to `notes.md`
6. Stopwatch — timestamp-based start / pause-resume / stop-reset, in memory
7. Settings, opacity, pin toggle
8. Tray, global hotkey, autostart
9. Packaging

## Git — commit every phase

One commit per **completed** phase (after its success criterion passes). Propose the commit at each phase boundary before moving on.

- Message: `phase N: <what now works>`
  e.g. `phase 2: layout shell — tab switch + persistent stopwatch region`
- Tag each completed phase: `git tag phase-N && git push --tags`
- Push after every phase: `git push`
- `.gitignore` covers `node_modules/`, `src-tauri/target/`, `dist/`.
