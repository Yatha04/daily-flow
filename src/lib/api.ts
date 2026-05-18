import { invoke } from "@tauri-apps/api/core";
import type { WindowState, Settings, Task, RolloverResult } from "./types";

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

export async function loadTasks(): Promise<Task[]> {
  return await invoke<Task[]>("load_tasks");
}

export async function saveTasks(tasks: Task[]): Promise<void> {
  await invoke("save_tasks", { tasks });
}

export async function rolloverTasks(today: string): Promise<RolloverResult> {
  return await invoke<RolloverResult>("rollover_tasks", { today });
}

export async function loadNotes(): Promise<string> {
  return await invoke<string>("load_notes");
}

export async function saveNotes(content: string): Promise<void> {
  await invoke("save_notes", { content });
}

export async function setPinMode(pinned: boolean): Promise<void> {
  await invoke("set_pin_mode", { pinned });
}
