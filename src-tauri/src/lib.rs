mod overlay;

use overlay::OverlayState;
use tauri::Manager;

const OVERLAY_PORT: u16 = 17800;

#[tauri::command]
async fn push_state(
    payload: String,
    state: tauri::State<'_, OverlayState>,
) -> Result<(), String> {
    state.push_state(payload).await;
    Ok(())
}

#[tauri::command]
async fn push_style(
    payload: String,
    state: tauri::State<'_, OverlayState>,
) -> Result<(), String> {
    state.push_style(payload).await;
    Ok(())
}

#[tauri::command]
fn overlay_url() -> String {
    format!("http://localhost:{}/", OVERLAY_PORT)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let overlay_state = OverlayState::new();

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .manage(overlay_state.clone())
        .setup(move |app| {
            let st = app.state::<OverlayState>().inner().clone();
            tauri::async_runtime::spawn(async move {
                overlay::start_server(st, OVERLAY_PORT).await;
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![push_state, push_style, overlay_url])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
