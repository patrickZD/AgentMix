//! Export-plan construction (DESIGN.md §6.12, §8.2).
//!
//! Builds an `ExportPlan` and nothing else — no user files are written here.
//! `ExportCoordinator.execute` (T13) is the only writer, and it consumes the
//! same plan object the Dry-run preview rendered (DoD-3). `backups_root` is
//! injected so the planner stays filesystem-pure and headless-testable.

use std::path::Path;
use std::time::{SystemTime, UNIX_EPOCH};

use agentmix_types::{
    BackupPlan, ConflictCandidate, ConflictKind, ExportConflict, ExportPlan, ExportRequestItem,
    FileOperation, FileOperationKind, ManagedAsset, ManagedManifest,
};
use walkdir::WalkDir;

use crate::composer::detect_export_conflicts;

const MANIFEST_FILE: &str = ".agentmix-manifest.json";

/// Build the export plan for `items` into `target_project_path`'s
/// `.claude/skills/` directory. Produces operations, conflicts, the backup plan
/// and the managed manifest; writes nothing.
pub fn build_export_plan(
    items: &[ExportRequestItem],
    target_project_path: &Path,
    backups_root: &Path,
) -> ExportPlan {
    let target_dir = target_project_path.join(".claude").join("skills");

    let mut operations: Vec<FileOperation> = Vec::new();
    let mut conflicts: Vec<ExportConflict> = Vec::new();
    let mut managed_assets: Vec<ManagedAsset> = Vec::new();
    let mut has_overwrite = false;

    // Intra-selection name collisions (case-insensitive), via the shared composer.
    let candidates: Vec<ConflictCandidate> = items
        .iter()
        .map(|i| ConflictCandidate {
            id: i.asset_id.clone(),
            exported_name: i.exported_name.clone(),
        })
        .collect();
    conflicts.extend(detect_export_conflicts(&candidates));

    for item in items {
        let skill_target = target_dir.join(&item.exported_name);

        // A directory with this name already at the target blocks export until
        // the user confirms overwrite in the preview (DESIGN.md §6.2).
        if skill_target.exists() {
            conflicts.push(ExportConflict {
                kind: ConflictKind::TargetExists,
                exported_name: item.exported_name.clone(),
                asset_ids: vec![item.asset_id.clone()],
            });
        }

        // One operation per source file; the whole skill directory is copied.
        let source_dir = Path::new(&item.source_dir);
        for entry in WalkDir::new(source_dir)
            .follow_links(false)
            .into_iter()
            .filter_map(Result::ok)
            .filter(|e| e.file_type().is_file())
        {
            let rel = entry
                .path()
                .strip_prefix(source_dir)
                .unwrap_or(entry.path());
            let dest = skill_target.join(rel);
            let size = entry.metadata().map(|m| m.len()).unwrap_or(0);
            let kind = if dest.exists() {
                has_overwrite = true;
                FileOperationKind::Overwrite
            } else {
                FileOperationKind::Create
            };
            operations.push(FileOperation {
                kind,
                path: path_string(&dest),
                size,
                source_asset: item.asset_id.clone(),
            });
        }

        managed_assets.push(ManagedAsset {
            name: item.exported_name.clone(),
            source_ref: item.source_ref.clone(),
            content_hash: content_hash_of(source_dir),
        });
    }

    let total_bytes = operations.iter().map(|o| o.size).sum();

    // Back up the existing target directory only when something will be overwritten.
    let backups = if has_overwrite && target_dir.exists() {
        vec![BackupPlan {
            target_path: path_string(&target_dir),
            backup_archive: path_string(
                &backups_root
                    .join(path_hash(&path_string(target_project_path)))
                    .join(format!("{}.zip", now_millis())),
            ),
            size_bytes: dir_size(&target_dir),
        }]
    } else {
        Vec::new()
    };

    ExportPlan {
        target_dir: path_string(&target_dir),
        operations,
        conflicts,
        backups,
        managed_manifest: ManagedManifest {
            manifest_path: path_string(&target_dir.join(MANIFEST_FILE)),
            managed_assets,
        },
        total_bytes,
    }
}

/// Store/compare paths with forward slashes (DESIGN.md §9.8).
fn path_string(p: &Path) -> String {
    p.to_string_lossy().replace('\\', "/")
}

fn fnv1a_hex(bytes: &[u8]) -> String {
    let mut hash: u64 = 0xcbf29ce484222325;
    for b in bytes {
        hash ^= *b as u64;
        hash = hash.wrapping_mul(0x100000001b3);
    }
    format!("{hash:016x}")
}

/// Stable hash of the normalized target path, for the backup sub-directory.
fn path_hash(path: &str) -> String {
    fnv1a_hex(path.to_lowercase().as_bytes())
}

/// Content hash of the asset's SKILL.md, for later reconciliation.
fn content_hash_of(dir: &Path) -> String {
    let bytes = std::fs::read(dir.join("SKILL.md")).unwrap_or_default();
    fnv1a_hex(&bytes)
}

fn dir_size(dir: &Path) -> u64 {
    WalkDir::new(dir)
        .follow_links(false)
        .into_iter()
        .filter_map(Result::ok)
        .filter(|e| e.file_type().is_file())
        .filter_map(|e| e.metadata().ok())
        .map(|m| m.len())
        .sum()
}

fn now_millis() -> String {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis().to_string())
        .unwrap_or_else(|_| "0".to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn write_file(path: &Path, content: &str) {
        std::fs::create_dir_all(path.parent().unwrap()).unwrap();
        std::fs::write(path, content).unwrap();
    }

    fn item(asset_id: &str, source_dir: &Path, exported_name: &str) -> ExportRequestItem {
        ExportRequestItem {
            asset_id: asset_id.to_string(),
            source_dir: source_dir.to_string_lossy().to_string(),
            exported_name: exported_name.to_string(),
            source_ref: format!("proj:{exported_name}"),
        }
    }

    #[test]
    fn clean_target_produces_only_create_ops_and_no_backup() {
        let tmp = tempfile::tempdir().unwrap();
        let src = tmp.path().join("src/code-review");
        write_file(&src.join("SKILL.md"), "---\nname: code-review\n---\nbody");
        write_file(&src.join("reference.md"), "ref"); // 3 bytes
        let target = tmp.path().join("target");
        let backups = tmp.path().join("backups");

        let plan = build_export_plan(&[item("a", &src, "code-review")], &target, &backups);

        assert!(plan.conflicts.is_empty());
        assert!(plan.backups.is_empty());
        assert_eq!(plan.operations.len(), 2);
        assert!(plan
            .operations
            .iter()
            .all(|o| o.kind == FileOperationKind::Create));
        // total_bytes equals the sum of source file sizes.
        let expected: u64 = plan.operations.iter().map(|o| o.size).sum();
        assert_eq!(plan.total_bytes, expected);
        let ref_op = plan
            .operations
            .iter()
            .find(|o| o.path.ends_with("code-review/reference.md"))
            .unwrap();
        assert_eq!(ref_op.size, 3);
        // Manifest + target paths use forward slashes and the expected location.
        assert!(plan.target_dir.ends_with("/.claude/skills"));
        assert!(plan
            .managed_manifest
            .manifest_path
            .ends_with("/.claude/skills/.agentmix-manifest.json"));
        assert_eq!(plan.managed_manifest.managed_assets[0].name, "code-review");
    }

    #[test]
    fn building_a_plan_writes_nothing() {
        let tmp = tempfile::tempdir().unwrap();
        let src = tmp.path().join("src/code-review");
        write_file(&src.join("SKILL.md"), "---\nname: code-review\n---\n");
        let target = tmp.path().join("target");

        build_export_plan(
            &[item("a", &src, "code-review")],
            &target,
            &tmp.path().join("backups"),
        );

        // The planner must not create the target tree.
        assert!(!target.join(".claude").exists());
    }

    #[test]
    fn existing_target_dir_yields_overwrite_conflict_and_backup() {
        let tmp = tempfile::tempdir().unwrap();
        let src = tmp.path().join("src/code-review");
        write_file(&src.join("SKILL.md"), "---\nname: code-review\n---\nnew");
        write_file(&src.join("extra.md"), "extra");
        let target = tmp.path().join("target");
        // Pre-existing exported dir with one of the same files.
        write_file(
            &target.join(".claude/skills/code-review/SKILL.md"),
            "old content",
        );

        let plan = build_export_plan(
            &[item("a", &src, "code-review")],
            &target,
            &tmp.path().join("backups"),
        );

        assert!(plan
            .conflicts
            .iter()
            .any(|c| c.kind == ConflictKind::TargetExists && c.exported_name == "code-review"));
        // SKILL.md exists at target -> overwrite; extra.md is new -> create.
        let skill_md = plan
            .operations
            .iter()
            .find(|o| o.path.ends_with("code-review/SKILL.md"))
            .unwrap();
        assert_eq!(skill_md.kind, FileOperationKind::Overwrite);
        assert!(plan.operations.iter().any(
            |o| o.path.ends_with("code-review/extra.md") && o.kind == FileOperationKind::Create
        ));
        // A backup of the existing target dir is planned (but not yet written).
        assert_eq!(plan.backups.len(), 1);
        assert!(plan.backups[0].size_bytes > 0);
        assert!(plan.backups[0].backup_archive.ends_with(".zip"));
        // Existing file is left untouched by planning.
        assert_eq!(
            std::fs::read_to_string(target.join(".claude/skills/code-review/SKILL.md")).unwrap(),
            "old content",
        );
    }

    #[test]
    fn same_exported_name_across_items_is_a_name_collision() {
        let tmp = tempfile::tempdir().unwrap();
        let a = tmp.path().join("src/a");
        let b = tmp.path().join("src/b");
        write_file(&a.join("SKILL.md"), "---\nname: dup\n---\n");
        write_file(&b.join("SKILL.md"), "---\nname: dup\n---\n");
        let target = tmp.path().join("target");

        let plan = build_export_plan(
            &[item("a", &a, "dup"), item("b", &b, "dup")],
            &target,
            &tmp.path().join("backups"),
        );

        let collision = plan
            .conflicts
            .iter()
            .find(|c| c.kind == ConflictKind::NameCollision)
            .unwrap();
        assert_eq!(collision.exported_name, "dup");
        assert_eq!(collision.asset_ids, vec!["a", "b"]);
    }
}
