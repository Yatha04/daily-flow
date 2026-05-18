use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

#[derive(Serialize, Deserialize, Clone, Copy, Debug)]
#[serde(rename_all = "camelCase")]
pub struct WindowState {
    pub x: i32,
    pub y: i32,
    pub width: i32,
    pub height: i32,
}

fn window_state_path(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    Ok(dir.join("window.json"))
}

#[tauri::command]
pub async fn load_window_state(app: AppHandle) -> Result<Option<WindowState>, String> {
    let path = window_state_path(&app)?;
    if !path.exists() {
        return Ok(None);
    }
    let bytes = match fs::read(&path) {
        Ok(b) => b,
        Err(e) => {
            eprintln!("load_window_state read error: {e}");
            return Ok(None);
        }
    };
    match serde_json::from_slice::<WindowState>(&bytes) {
        Ok(s) => Ok(Some(s)),
        Err(e) => {
            eprintln!("load_window_state parse error: {e}");
            Ok(None)
        }
    }
}

#[tauri::command]
pub async fn save_window_state(app: AppHandle, state: WindowState) -> Result<(), String> {
    // Clamp size to a sane minimum before persisting; do NOT clamp position.
    let state = WindowState {
        x: state.x.clamp(-32768, 32767),
        y: state.y.clamp(-32768, 32767),
        width: state.width.clamp(200, 16384),
        height: state.height.clamp(200, 16384),
    };
    let path = window_state_path(&app)?;
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let tmp = path.with_extension("json.tmp");
    let bytes = serde_json::to_vec(&state).map_err(|e| e.to_string())?;
    fs::write(&tmp, &bytes).map_err(|e| e.to_string())?;
    fs::rename(&tmp, &path).map_err(|e| e.to_string())?;
    Ok(())
}

#[derive(Serialize, Deserialize, Clone, Debug, Default)]
#[serde(rename_all = "camelCase")]
pub struct Settings {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub active_tab: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub last_seen_date: Option<String>,
}

fn settings_path(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    Ok(dir.join("settings.json"))
}

#[tauri::command]
pub async fn load_settings(app: AppHandle) -> Result<Option<Settings>, String> {
    let path = settings_path(&app)?;
    if !path.exists() {
        return Ok(None);
    }
    let bytes = match fs::read(&path) {
        Ok(b) => b,
        Err(e) => {
            eprintln!("load_settings read error: {e}");
            return Ok(None);
        }
    };
    match serde_json::from_slice::<Settings>(&bytes) {
        Ok(s) => Ok(Some(s)),
        Err(e) => {
            eprintln!("load_settings parse error: {e}");
            Ok(None)
        }
    }
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Task {
    pub id: String,
    pub text: String,
    pub done: bool,
    pub created_at: i64,
    pub order: i64,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct RolloverResult {
    pub rolled_over: bool,
    pub swept_count: usize,
    pub remaining: Vec<Task>,
}

fn tasks_path(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    Ok(dir.join("tasks.json"))
}

fn log_path(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    Ok(dir.join("completed-log.md"))
}

fn read_tasks(app: &AppHandle) -> Vec<Task> {
    let path = match tasks_path(app) {
        Ok(p) => p,
        Err(_) => return Vec::new(),
    };
    if !path.exists() {
        return Vec::new();
    }
    let bytes = match fs::read(&path) {
        Ok(b) => b,
        Err(e) => {
            eprintln!("read_tasks read error: {e}");
            return Vec::new();
        }
    };
    match serde_json::from_slice::<Vec<Task>>(&bytes) {
        Ok(v) => v,
        Err(e) => {
            eprintln!("read_tasks parse error: {e}");
            Vec::new()
        }
    }
}

fn write_tasks_atomic(app: &AppHandle, tasks: &[Task]) -> Result<(), String> {
    let path = tasks_path(app)?;
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let tmp = path.with_extension("json.tmp");
    let bytes = serde_json::to_vec(tasks).map_err(|e| e.to_string())?;
    fs::write(&tmp, &bytes).map_err(|e| e.to_string())?;
    fs::rename(&tmp, &path).map_err(|e| e.to_string())?;
    Ok(())
}

fn read_settings_file(app: &AppHandle) -> Settings {
    let path = match settings_path(app) {
        Ok(p) => p,
        Err(_) => return Settings::default(),
    };
    if !path.exists() {
        return Settings::default();
    }
    match fs::read(&path)
        .ok()
        .and_then(|b| serde_json::from_slice::<Settings>(&b).ok())
    {
        Some(s) => s,
        None => Settings::default(),
    }
}

fn write_settings_atomic(app: &AppHandle, settings: &Settings) -> Result<(), String> {
    let path = settings_path(app)?;
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let tmp = path.with_extension("json.tmp");
    let bytes = serde_json::to_vec(settings).map_err(|e| e.to_string())?;
    fs::write(&tmp, &bytes).map_err(|e| e.to_string())?;
    fs::rename(&tmp, &path).map_err(|e| e.to_string())?;
    Ok(())
}

fn is_valid_ymd(s: &str) -> bool {
    if s.len() != 10 {
        return false;
    }
    let b = s.as_bytes();
    b[4] == b'-'
        && b[7] == b'-'
        && b[0..4].iter().all(|c| c.is_ascii_digit())
        && b[5..7].iter().all(|c| c.is_ascii_digit())
        && b[8..10].iter().all(|c| c.is_ascii_digit())
}

fn append_completed_log(app: &AppHandle, date: &str, done: &[Task]) -> Result<(), String> {
    let path = log_path(app)?;
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let mut block = String::new();
    block.push_str(&format!("\n## {date}\n\n"));
    for t in done {
        let one_line = t.text.replace(['\n', '\r'], " ");
        block.push_str(&format!("- {one_line}\n"));
    }

    // Append: read existing bytes (if any), concat, atomic rename.
    let existing = fs::read(&path).unwrap_or_default();
    let mut combined = existing;
    combined.extend_from_slice(block.as_bytes());
    let tmp = path.with_extension("md.tmp");
    fs::write(&tmp, &combined).map_err(|e| e.to_string())?;
    fs::rename(&tmp, &path).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn load_tasks(app: AppHandle) -> Result<Vec<Task>, String> {
    Ok(read_tasks(&app))
}

#[tauri::command]
pub async fn save_tasks(app: AppHandle, tasks: Vec<Task>) -> Result<(), String> {
    write_tasks_atomic(&app, &tasks)
}

#[tauri::command]
pub async fn rollover_tasks(app: AppHandle, today: String) -> Result<RolloverResult, String> {
    if !is_valid_ymd(&today) {
        return Err("invalid date".to_string());
    }

    let existing_settings = read_settings_file(&app);
    let tasks = read_tasks(&app);

    if existing_settings.last_seen_date.as_deref() == Some(today.as_str()) {
        return Ok(RolloverResult {
            rolled_over: false,
            swept_count: 0,
            remaining: tasks,
        });
    }

    let heading = existing_settings
        .last_seen_date
        .clone()
        .unwrap_or_else(|| today.clone());

    let (done, mut undone): (Vec<Task>, Vec<Task>) = tasks.into_iter().partition(|t| t.done);
    let swept_count = done.len();

    // 1. Log first — dupes on crash are tolerable.
    if !done.is_empty() {
        append_completed_log(&app, &heading, &done)?;
    }

    // 2. Renumber and persist remaining tasks.
    for (i, t) in undone.iter_mut().enumerate() {
        t.order = i as i64;
    }
    write_tasks_atomic(&app, &undone)?;

    // 3. Update settings.lastSeenDate (merge: preserve activeTab).
    let updated = Settings {
        active_tab: existing_settings.active_tab,
        last_seen_date: Some(today),
    };
    write_settings_atomic(&app, &updated)?;

    Ok(RolloverResult {
        rolled_over: true,
        swept_count,
        remaining: undone,
    })
}

fn notes_path(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    Ok(dir.join("notes.md"))
}

#[tauri::command]
pub async fn load_notes(app: AppHandle) -> Result<String, String> {
    let path = notes_path(&app)?;
    if !path.exists() {
        return Ok(String::new());
    }
    match fs::read_to_string(&path) {
        Ok(s) => Ok(s),
        Err(e) => {
            eprintln!("load_notes read error: {e}");
            Ok(String::new())
        }
    }
}

#[tauri::command]
pub async fn save_notes(app: AppHandle, content: String) -> Result<(), String> {
    let path = notes_path(&app)?;
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let tmp = path.with_extension("md.tmp");
    fs::write(&tmp, content.as_bytes()).map_err(|e| e.to_string())?;
    fs::rename(&tmp, &path).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn save_settings(app: AppHandle, settings: Settings) -> Result<(), String> {
    // Validate activeTab strictly; drop anything unrecognized.
    let incoming = Settings {
        active_tab: settings.active_tab.and_then(|v| match v.as_str() {
            "todos" | "notes" => Some(v),
            _ => None,
        }),
        last_seen_date: settings.last_seen_date,
    };

    let path = settings_path(&app)?;
    let existing: Settings = if path.exists() {
        match fs::read(&path)
            .ok()
            .and_then(|b| serde_json::from_slice(&b).ok())
        {
            Some(s) => s,
            None => Settings::default(),
        }
    } else {
        Settings::default()
    };

    // Merge: each writer only updates fields it provides.
    let merged = Settings {
        active_tab: incoming.active_tab.or(existing.active_tab),
        last_seen_date: incoming.last_seen_date.or(existing.last_seen_date),
    };

    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let tmp = path.with_extension("json.tmp");
    let bytes = serde_json::to_vec(&merged).map_err(|e| e.to_string())?;
    fs::write(&tmp, &bytes).map_err(|e| e.to_string())?;
    fs::rename(&tmp, &path).map_err(|e| e.to_string())?;
    Ok(())
}
