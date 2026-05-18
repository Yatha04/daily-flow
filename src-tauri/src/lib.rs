mod storage;
#[cfg(windows)]
mod window;

use tauri::Manager;
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};

fn toggle_main_window(app: &tauri::AppHandle) {
    if let Some(win) = app.get_webview_window("main") {
        match win.is_visible() {
            Ok(true) => {
                let _ = win.hide();
            }
            _ => {
                let _ = win.show();
                let _ = win.set_focus();
            }
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec![]),
        ))
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(|app, _shortcut, event| {
                    if event.state() == ShortcutState::Pressed {
                        toggle_main_window(app);
                    }
                })
                .build(),
        )
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

            // Tray icon with context menu
            {
                use tauri::menu::{Menu, MenuItem, PredefinedMenuItem};
                use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};

                let toggle =
                    MenuItem::with_id(app, "toggle", "Show/Hide", true, None::<&str>)?;
                let sep = PredefinedMenuItem::separator(app)?;
                let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
                let menu = Menu::with_items(app, &[&toggle, &sep, &quit])?;

                TrayIconBuilder::new()
                    .icon(
                        app.default_window_icon()
                            .ok_or("no default window icon")?
                            .clone(),
                    )
                    .menu(&menu)
                    .on_menu_event(|app, event| match event.id.as_ref() {
                        "toggle" => toggle_main_window(app),
                        "quit" => app.exit(0),
                        _ => {}
                    })
                    .on_tray_icon_event(|tray, event| {
                        if let TrayIconEvent::Click {
                            button: MouseButton::Left,
                            button_state: MouseButtonState::Up,
                            ..
                        } = event
                        {
                            toggle_main_window(tray.app_handle());
                        }
                    })
                    .build(app)?;
            }

            // Global hotkey: Ctrl+Shift+Space — toggle window visibility
            {
                let shortcut =
                    Shortcut::new(Some(Modifiers::CONTROL | Modifiers::SHIFT), Code::Space);
                if let Err(e) = app.global_shortcut().register(shortcut) {
                    eprintln!("global shortcut register error: {e}");
                }
            }

            Ok(())
        })
        .invoke_handler({
            #[cfg(windows)]
            {
                tauri::generate_handler![
                    storage::load_window_state,
                    storage::save_window_state,
                    storage::load_settings,
                    storage::save_settings,
                    storage::load_tasks,
                    storage::save_tasks,
                    storage::rollover_tasks,
                    storage::load_notes,
                    storage::save_notes,
                    window::set_pin_mode,
                ]
            }
            #[cfg(not(windows))]
            {
                tauri::generate_handler![
                    storage::load_window_state,
                    storage::save_window_state,
                    storage::load_settings,
                    storage::save_settings,
                    storage::load_tasks,
                    storage::save_tasks,
                    storage::rollover_tasks,
                    storage::load_notes,
                    storage::save_notes,
                ]
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application")
}
