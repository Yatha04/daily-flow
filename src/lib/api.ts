import { invoke } from "@tauri-apps/api/core";
import type { WindowState, Settings } from "./types";

export async function loadWindowState(): Promise<WindowState | null> {
  return await invoke<WindowState | null>("load_window_state");
}

export async function saveWindowState(state: WindowState): Promise<void> {
  await invoke("save_window_state", { state });
}

export async function loadSettings(): Promise<Settings | null> {
  return await invoke<Settings | null>("load_settings");
}

export async function saveSettings(settings: Settings): Promise<void> {
  await invoke("save_settings", { settings });
}
