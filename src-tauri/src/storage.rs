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
