use agentmix_types::SourceProject;
use tauri_plugin_dialog::DialogExt;

// IPC smoke-test command.
#[tauri::command]
fn ping() -> String {
    "pong".to_string()
}

/// Open the native folder picker and return the chosen directory, or None if
/// the user cancelled. Async so it runs off the main thread, where the dialog
/// crate's blocking helper is safe to call. Verified via `pnpm tauri dev`; it
/// is a thin platform wrapper and is not headless-testable.
#[tauri::command]
async fn pick_directory(app: tauri::AppHandle) -> Option<String> {
    app.dialog()
        .file()
        .blocking_pick_folder()
        .and_then(|p| p.into_path().ok())
        .map(|p| p.to_string_lossy().to_string())
}

/// Scan a project directory for SKILL.md files. Thin wrapper over the tauri-free
/// agentmix-core logic; all scanning/classification lives there so it is testable.
#[tauri::command]
fn scan_project(path: String) -> Result<SourceProject, String> {
    let root = std::path::Path::new(&path);
    if !root.is_dir() {
        return Err(format!("not a directory: {path}"));
    }
    Ok(agentmix_core::scanner::scan_project(root))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![ping, scan_project, pick_directory])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
