use std::path::PathBuf;

use agentmix_types::{
    ConflictCandidate, ExecutionReport, ExportConflict, ExportPlan, ExportRequestItem,
    SourceProject,
};
use tauri_plugin_dialog::DialogExt;

// IPC smoke-test command.
#[tauri::command]
fn ping() -> String {
    "pong".to_string()
}

/// Test-only seam, compiled ONLY with `--features e2e` (never in production).
/// The WebDriver suite cannot drive the native folder dialog, so it queues the
/// path the next `pick_directory` should return.
#[cfg(feature = "e2e")]
mod e2e_hook {
    use std::sync::Mutex;
    static NEXT_PICK: Mutex<Option<String>> = Mutex::new(None);
    pub fn set_next_pick(path: String) {
        *NEXT_PICK.lock().unwrap() = Some(path);
    }
    pub fn take_next_pick() -> Option<String> {
        NEXT_PICK.lock().unwrap().take()
    }
}

#[cfg(feature = "e2e")]
#[tauri::command]
fn e2e_set_next_pick(path: String) {
    e2e_hook::set_next_pick(path);
}

/// Open the native folder picker and return the chosen directory, or None if
/// the user cancelled. Async so it runs off the main thread, where the dialog
/// crate's blocking helper is safe to call. Verified via `pnpm tauri dev`; it
/// is a thin platform wrapper and is not headless-testable.
#[tauri::command]
async fn pick_directory(app: tauri::AppHandle) -> Option<String> {
    // Under the e2e feature a queued path stands in for the (un-drivable) dialog.
    #[cfg(feature = "e2e")]
    if let Some(path) = e2e_hook::take_next_pick() {
        return Some(path);
    }
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

/// Detect v0.1 export conflicts among the selected assets. Thin wrapper over the
/// tauri-free composer; the same function builds the ExportPlan's conflict list
/// (T11), so the live UI warning and the export-time check never diverge.
#[tauri::command]
fn detect_conflicts(candidates: Vec<ConflictCandidate>) -> Vec<ExportConflict> {
    agentmix_core::composer::detect_export_conflicts(&candidates)
}

/// Resolve the per-user backups root: ~/.agentmix/backups (never inside a target
/// project). Backups are isolated here per DESIGN.md §6.2 / the architecture red
/// lines.
fn backups_root() -> Result<PathBuf, String> {
    let home = std::env::var("USERPROFILE")
        .or_else(|_| std::env::var("HOME"))
        .map_err(|_| "could not resolve home directory".to_string())?;
    Ok(PathBuf::from(home).join(".agentmix").join("backups"))
}

/// Build the Dry-run ExportPlan for the selected assets into the target project.
/// Only produces the plan; no user files are written (DESIGN.md §6.12).
#[tauri::command]
fn build_export_plan(
    items: Vec<ExportRequestItem>,
    target_project_path: String,
) -> Result<ExportPlan, String> {
    let target = std::path::Path::new(&target_project_path);
    if !target.is_dir() {
        return Err(format!("not a directory: {target_project_path}"));
    }
    Ok(agentmix_core::exporter::build_export_plan(
        &items,
        target,
        &backups_root()?,
    ))
}

/// Execute the plan: back up, write the selected skills to `.claude/skills/`,
/// then the manifest. The only command allowed to modify user files; it
/// delegates to the single writer in agentmix-core (DESIGN.md §8.2).
/// `acknowledged_asset_ids` are the assets whose security risk the user
/// explicitly accepted in the preview (per-skill, no bulk bypass, §6.11).
#[tauri::command]
fn execute_export(
    plan: ExportPlan,
    items: Vec<ExportRequestItem>,
    acknowledged_asset_ids: Vec<String>,
) -> Result<ExecutionReport, String> {
    agentmix_core::exporter::execute(&plan, &items, &acknowledged_asset_ids)
}

/// Reveal a path in the OS file manager (Windows Explorer); used by the
/// "open backup folder" action. v0.1 is Windows-only.
#[tauri::command]
fn open_path(path: String) -> Result<(), String> {
    let native = path.replace('/', "\\");
    std::process::Command::new("explorer")
        .arg(&native)
        .spawn()
        .map(|_| ())
        .map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init());

    // The e2e build registers one extra test-only command; production does not.
    #[cfg(not(feature = "e2e"))]
    let builder = builder.invoke_handler(tauri::generate_handler![
        ping,
        scan_project,
        pick_directory,
        detect_conflicts,
        build_export_plan,
        execute_export,
        open_path
    ]);
    #[cfg(feature = "e2e")]
    let builder = builder.invoke_handler(tauri::generate_handler![
        ping,
        scan_project,
        pick_directory,
        detect_conflicts,
        build_export_plan,
        execute_export,
        open_path,
        e2e_set_next_pick
    ]);

    builder
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
