use std::path::PathBuf;

use agentmix_core::update::{
    evaluate_cache, load_cache, save_cache, CacheDecision, CachedUpdate, UpdateCheckCache,
};
use agentmix_types::{
    ConflictCandidate, ExecutionReport, ExportConflict, ExportPlan, ExportRequestItem,
    SourceProject, UpdateCheckResult, UpdateDownloadProgress,
};
use tauri::Emitter;
use tauri_plugin_dialog::DialogExt;
use tauri_plugin_updater::UpdaterExt;

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

/// Resolve the per-user AgentMix data root: ~/.agentmix (backups, update-check
/// cache). Never inside a target project.
fn agentmix_root() -> Result<PathBuf, String> {
    let home = std::env::var("USERPROFILE")
        .or_else(|_| std::env::var("HOME"))
        .map_err(|_| "could not resolve home directory".to_string())?;
    Ok(PathBuf::from(home).join(".agentmix"))
}

/// Resolve the per-user backups root: ~/.agentmix/backups (never inside a target
/// project). Backups are isolated here per DESIGN.md §6.2 / the architecture red
/// lines.
fn backups_root() -> Result<PathBuf, String> {
    Ok(agentmix_root()?.join("backups"))
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
/// `overwrite_confirmed` is the user's explicit consent to overwrite files that
/// already exist at the target (§6.2); execute refuses an unconfirmed overwrite.
#[tauri::command]
fn execute_export(
    plan: ExportPlan,
    items: Vec<ExportRequestItem>,
    acknowledged_asset_ids: Vec<String>,
    overwrite_confirmed: bool,
) -> Result<ExecutionReport, String> {
    agentmix_core::exporter::execute(&plan, &items, &acknowledged_asset_ids, overwrite_confirmed)
}

/// Update-check network timeout; past this the check silently reports
/// no-update and the next call retries (§6.16 fail-quiet contract).
const UPDATE_CHECK_TIMEOUT_SECS: u64 = 10;
/// Download timeout for install_update; package downloads are MB-sized, so
/// this is far looser than the check timeout.
const UPDATE_DOWNLOAD_TIMEOUT_SECS: u64 = 300;
/// Event carrying an `UpdateDownloadProgress` payload during install_update.
const UPDATE_PROGRESS_EVENT: &str = "update-download-progress";

/// Path of the update-check cache file: ~/.agentmix/update-check.json.
fn update_cache_path() -> Result<PathBuf, String> {
    Ok(agentmix_root()?.join("update-check.json"))
}

fn now_unix_secs() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0)
}

fn no_update() -> UpdateCheckResult {
    UpdateCheckResult {
        available: false,
        version: None,
        notes: None,
    }
}

fn update_result_from(latest: Option<CachedUpdate>) -> UpdateCheckResult {
    match latest {
        Some(u) => UpdateCheckResult {
            available: true,
            version: Some(u.version),
            notes: u.notes,
        },
        None => no_update(),
    }
}

/// Check GitHub Releases for a newer version (DESIGN.md §6.16). A successful
/// result is cached to ~/.agentmix/update-check.json for
/// UPDATE_CHECK_CACHE_TTL_HOURS; within the TTL the cache answers without a
/// network request. Network failure / timeout silently reports no-update and
/// is NOT cached, so the next call retries. `force` skips the cache for the
/// manual "check for updates" action (T21). Cache/version branching lives in
/// agentmix-core::update where it is unit-tested headlessly.
#[tauri::command]
async fn check_for_update(app: tauri::AppHandle, force: bool) -> UpdateCheckResult {
    let Ok(cache_path) = update_cache_path() else {
        return no_update();
    };
    let current = app.package_info().version.to_string();
    let now = now_unix_secs();

    if !force {
        if let Some(cache) = load_cache(&cache_path) {
            if let CacheDecision::Fresh(latest) = evaluate_cache(&cache, &current, now) {
                return update_result_from(latest);
            }
        }
    }

    let Ok(updater) = app
        .updater_builder()
        .timeout(std::time::Duration::from_secs(UPDATE_CHECK_TIMEOUT_SECS))
        .build()
    else {
        return no_update();
    };
    match updater.check().await {
        Ok(found) => {
            let latest = found.map(|u| CachedUpdate {
                version: u.version.clone(),
                notes: u.body.clone(),
            });
            // Only successful checks are cached; a failed check retries next call.
            let _ = save_cache(
                &cache_path,
                &UpdateCheckCache {
                    checked_at_unix_secs: now,
                    latest: latest.clone(),
                },
            );
            update_result_from(latest)
        }
        Err(_) => no_update(),
    }
}

/// Download and install the pending update, then restart the app. The updater
/// plugin verifies the artifact signature against the pubkey baked into
/// tauri.conf.json; any signature/download failure aborts with an error and
/// nothing is replaced (red line: a failed verification must never install).
/// Emits UPDATE_PROGRESS_EVENT for the UI download indicator (T21).
#[tauri::command]
async fn install_update(app: tauri::AppHandle) -> Result<(), String> {
    let updater = app
        .updater_builder()
        .timeout(std::time::Duration::from_secs(UPDATE_DOWNLOAD_TIMEOUT_SECS))
        .build()
        .map_err(|e| e.to_string())?;
    let update = updater
        .check()
        .await
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "no update available".to_string())?;

    let mut downloaded_bytes: u64 = 0;
    let progress_app = app.clone();
    update
        .download_and_install(
            move |chunk, total| {
                downloaded_bytes += chunk as u64;
                let _ = progress_app.emit(
                    UPDATE_PROGRESS_EVENT,
                    UpdateDownloadProgress {
                        downloaded_bytes,
                        total_bytes: total,
                    },
                );
            },
            || {},
        )
        .await
        .map_err(|e| e.to_string())?;

    // The fresh check above found and installed an update; replace-on-restart.
    app.restart();
}

/// Reveal a path in the OS file manager (Windows Explorer); used by the
/// "open backup folder" action. v0.1 is Windows-only. The path is passed as a
/// single argument (no shell), so it is not a command-injection sink; keep the
/// caller feeding it an internally-sourced path (the backup archive dir), never
/// a raw user string, so it can't become an arbitrary-`explorer`-argument sink.
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
    // Only the dialog and updater plugins are registered. The fs plugin is
    // deliberately NOT registered: all file I/O goes through the Rust commands
    // (the single writer), so the webview gets no direct filesystem surface.
    // The updater is likewise driven only via the Rust commands below (zero
    // new npm deps, plan decision 4); its JS API is never exposed.
    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_updater::Builder::new().build());

    // The e2e build registers one extra test-only command; production does not.
    #[cfg(not(feature = "e2e"))]
    let builder = builder.invoke_handler(tauri::generate_handler![
        ping,
        scan_project,
        pick_directory,
        detect_conflicts,
        build_export_plan,
        execute_export,
        open_path,
        check_for_update,
        install_update
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
        check_for_update,
        install_update,
        e2e_set_next_pick
    ]);

    builder
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
