# CLAUDE.md

Shared context for this project. Every agent reads this. Keep it the single source of truth — if a rule changes, change it here, not in individual agent prompts.

## Project

A Tauri 2 desktop to-do widget for Windows: a translucent, frameless panel that sits on the desktop, behind other windows but still clickable. React + TypeScript frontend, Rust backend.

## Stack

- Tauri 2
- Frontend: React + TypeScript — `src/`
- Backend: Rust — `src-tauri/`
- Target: Windows only

## Layout

```
src/
  App.tsx
  components/        TaskList, TaskRow, AddTaskInput
  lib/
    api.ts           typed invoke() wrappers — the ONLY place components call Rust
    types.ts         TS types (must match Rust)
  styles.css
src-tauri/
  src/
    main.rs          app setup, plugin registration
    window.rs        HWND styles, z-order, hotkey
    storage.rs       atomic read/write commands
  tauri.conf.json
  capabilities/      command + plugin permissions
```

## Data model

Source of truth for a task. The TypeScript type and Rust struct **must match exactly** — a mismatch corrupts data silently and is a critical bug.

```ts
// src/lib/types.ts
interface Task {
  id: string;        // nanoid
  text: string;
  done: boolean;
  createdAt: number;  // epoch ms
  order: number;      // manual sort order
}
```

```rust
// src-tauri/src/storage.rs
#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]   // created_at <-> createdAt
struct Task {
    id: String,
    text: String,
    done: bool,
    created_at: i64,
    order: i64,
}
```

Files: `tasks.json` and `settings.json` live in the Tauri app-data dir (`app_data_dir()`), never next to the exe.

## Hard rules — do not violate

- **Persistence flow:** React holds state → debounce ~300ms → Rust command writes atomically (temp file + rename). React never writes app-data files. `localStorage` is never the source of truth.
- **Capabilities:** every new or renamed command and every plugin must be added to `src-tauri/capabilities/` in the same change. Missing = silent failure.
- **Window:** bottom-of-z-order with `WS_EX_NOACTIVATE` + `WS_EX_TOOLWINDOW`. Never parent to WorkerW/Progman — it breaks input for an interactive app.
- **Drag:** only a dedicated strip or the panel padding gets `data-tauri-drag-region`. Never the whole panel (it eats clicks on rows).
- **Transparency:** every text element gets a scrim or shadow. Not optional — text is unreadable on light wallpapers without it.
- **Always-running:** clean up every effect, listener, and event subscription. No polling loops. No leaks — this app runs all day.
- **Rust:** no `unwrap()` / `expect()` / `panic!` in command handlers. Validate all input crossing from the frontend.
- **Versioned APIs:** verify version-sensitive Tauri/crate/plugin signatures against current docs. Do not assert them from memory.

## Build discipline

Platform shell before features. Each phase has one testable success criterion. Stop and verify on real Windows before starting the next phase.

1. Window shell — translucent, behind windows, no taskbar, draggable, position persists
2. Static list UI — nail the look
3. Add / complete / delete / reorder — in memory
4. Persistence — atomic Rust read/write
5. Settings, opacity, pin toggle
6. Tray, global hotkey, autostart
7. Packaging

## Git — commit every phase

One commit per **completed** phase (after its success criterion passes — not mid-phase WIP unless you need a save point). At each phase boundary, propose the commit before moving on.

- Message format: `phase N: <what now works>`
  e.g. `phase 1: window shell — translucent, behind windows, draggable, position persists`
- Tag each completed phase so you can roll back to a known-good checkpoint:
  `git tag phase-N && git push --tags`
- Push to GitHub after every phase: `git push`
- `.gitignore` must cover `node_modules/`, `src-tauri/target/`, `dist/` (the scaffold sets most of this — confirm it).

First-time setup:

```
git init
git add .
git commit -m "chore: scaffold tauri + react project"
# create an empty repo on GitHub, then:
git remote add origin <your-repo-url>
git push -u origin main
```