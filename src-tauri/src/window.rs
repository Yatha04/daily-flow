#![cfg(windows)]
use tauri::WebviewWindow;
use windows::Win32::Foundation::{HWND, LPARAM, LRESULT, WPARAM};
use windows::Win32::UI::Shell::{DefSubclassProc, SetWindowSubclass};
use windows::Win32::UI::WindowsAndMessaging::{
    GetWindowLongPtrW, SetWindowLongPtrW, SetWindowPos, GWL_EXSTYLE, HWND_BOTTOM, MA_NOACTIVATE,
    SWP_FRAMECHANGED, SWP_NOACTIVATE, SWP_NOMOVE, SWP_NOSIZE, WM_MOUSEACTIVATE, WS_EX_APPWINDOW,
    WS_EX_TOOLWINDOW,
};

const SUBCLASS_ID: usize = 1;

// Intercepts WM_MOUSEACTIVATE to return MA_NOACTIVATE, preventing focus steal
// without blocking mouse input. WS_EX_NOACTIVATE achieves the same goal but
// breaks WebView2's mouse-event routing after nearby window activation changes.
unsafe extern "system" fn widget_subclass_proc(
    hwnd: HWND,
    msg: u32,
    wparam: WPARAM,
    lparam: LPARAM,
    _subclass_id: usize,
    _ref_data: usize,
) -> LRESULT {
    if msg == WM_MOUSEACTIVATE {
        return LRESULT(MA_NOACTIVATE as isize);
    }
    DefSubclassProc(hwnd, msg, wparam, lparam)
}

pub fn apply_widget_styles(window: &WebviewWindow) -> Result<(), String> {
    let hwnd: HWND = window.hwnd().map_err(|e| e.to_string())?;
    unsafe {
        let current = GetWindowLongPtrW(hwnd, GWL_EXSTYLE);
        let new_style = (current | WS_EX_TOOLWINDOW.0 as isize) & !(WS_EX_APPWINDOW.0 as isize);
        SetWindowLongPtrW(hwnd, GWL_EXSTYLE, new_style);

        SetWindowPos(
            hwnd,
            Some(HWND_BOTTOM),
            0, 0, 0, 0,
            SWP_NOMOVE | SWP_NOSIZE | SWP_NOACTIVATE | SWP_FRAMECHANGED,
        )
        .map_err(|e| e.to_string())?;

        let ok = SetWindowSubclass(hwnd, Some(widget_subclass_proc), SUBCLASS_ID, 0);
        if !ok.as_bool() {
            eprintln!("SetWindowSubclass failed (non-fatal)");
        }
    }
    Ok(())
}
