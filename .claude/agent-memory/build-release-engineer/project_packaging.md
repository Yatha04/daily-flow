---
name: project-packaging
description: Packaging state for the notebook Tauri 2 app — first successful production build details
metadata:
  type: project
---

First production build completed successfully on 2026-05-18.

**Artifacts produced:**
- NSIS installer: `src-tauri/target/release/bundle/nsis/notebook_0.1.0_x64-setup.exe` (2.00 MB)
- MSI installer: `src-tauri/target/release/bundle/msi/notebook_0.1.0_x64_en-US.msi` (3.12 MB)

**Config at build time:**
- `bundle.targets: "all"` in tauri.conf.json — produces both NSIS and MSI
- Identifier: `com.yatha.notebook` (stable, do NOT change — orphans user data and autostart entries)
- Version: `0.1.0` in both tauri.conf.json and Cargo.toml
- App is unsigned — SmartScreen will warn on other machines

**Why:** Phase 9 (packaging) of the project roadmap. Personal use, no code-signing certificate available.

**How to apply:** When bumping versions, update both tauri.conf.json and Cargo.toml consistently. Do not change the identifier. The NSIS installer is the primary distribution artifact for Windows.
