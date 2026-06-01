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
#[tauri::command]
fn execute_export(
    plan: ExportPlan,
    items: Vec<ExportRequestItem>,
) -> Result<ExecutionReport, String> {
    agentmix_core::exporter::execute(&plan, &items)
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
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            ping,
            scan_project,
            pick_directory,
            detect_conflicts,
            build_export_plan,
            execute_export,
            open_path
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
