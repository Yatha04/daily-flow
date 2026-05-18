mod storage;
#[cfg(windows)]
mod window;

#[cfg(windows)]
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            #[cfg(windows)]
            {
                match app.get_webview_window("main") {
                    Some(win) => {
                        if let Err(e) = window::apply_widget_styles(&win) {
                            eprintln!("apply_widget_styles error: {e}");
                        }
                    }
                    None => eprintln!("setup: window 'main' not found"),
                }
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            storage::load_window_state,
            storage::save_window_state,
            storage::load_settings,
            storage::save_settings,
            storage::load_tasks,
            storage::save_tasks,
            storage::rollover_tasks,
            storage::load_notes,
            storage::save_notes,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application")
}
