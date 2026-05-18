---
name: project-phase1-complete
description: Phase 1 (window shell) frontend is complete and building clean
metadata:
  type: project
---

Phase 1 frontend shell is implemented and passes `npm run build` with zero errors.

**Why:** Phase 1 goal is a translucent frameless panel whose position and size persist across restarts via Rust commands.

**How to apply:** Phase 2 starts with static task list UI — add `src/components/` directory with `TaskList` and `TaskRow`. The `WindowState` type and api.ts wrappers are already in place; next phase adds `Task` type and `load_tasks`/`save_tasks` commands to api.ts.

Rust commands depended on (must be allowlisted in capabilities):
- `load_window_state` — returns `WindowState | null`
- `save_window_state` — accepts `{ state: WindowState }`, returns void
