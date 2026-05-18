---
name: project-phase1
description: Phase 1 of the notebook Tauri widget — window shell with atomic persistence, completed and cargo-check clean
metadata:
  type: project
---

Phase 1 (window shell + storage persistence) is implemented and cargo check passes.

**Why:** Phase-by-phase build discipline per CLAUDE.md — each phase verified before starting the next.

**How to apply:** Phase 2 is the static task list UI (React side). The Rust side for Phase 2 will add the Task struct and tasks.json read/write commands. Do not start those until the frontend confirms Phase 1 visually passes on Windows.

Key decisions made in Phase 1:
- App-defined command permissions require a `src-tauri/permissions/` TOML file (not a capability namespace prefix). The bare identifier `allow-load-window-state` works when the TOML file defines it.
- `use tauri::Manager;` must be in scope for `app.get_webview_window()` in the setup closure.
- The `windows` crate is gated with `[target.'cfg(windows)'.dependencies]`.
