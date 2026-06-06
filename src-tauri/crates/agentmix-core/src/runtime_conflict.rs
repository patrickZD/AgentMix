//! Runtime-conflict detection (DESIGN.md §1.2 / §1.4).
//!
//! A RuntimeConflict is a warning, never a blocker: when a skill being exported
//! has the same name as one the target tool ALREADY reads from a different
//! scope, the tool's `precedence` + `duplicateNameBehavior` decide what happens
//! at runtime — one copy shadows the other, or both stay active. This computes
//! that outcome from `ToolAdapter` data alone (no per-tool branch), so it stays
//! adapter-pure like the rest of the pipeline. It only reads the filesystem to
//! see whether a same-named skill already sits at the other scope; it writes
//! nothing. The sole export blocker remains ExportConflict (composer / exporter).

use std::path::Path;

use agentmix_types::{
    DuplicateNameBehavior, ExportScope, Precedence, RuntimeConflict, RuntimeConflictKind,
    ToolAdapter,
};

use crate::tool_adapters::resolve_destination_roots;

/// The scope a tool reads from besides `scope` — where a cross-scope duplicate
/// would live. v0.2.0 reasons about the project <-> global pair.
fn other_scope(scope: ExportScope) -> ExportScope {
    match scope {
        ExportScope::Project => ExportScope::Global,
        ExportScope::Global => ExportScope::Project,
    }
}

/// Classify the runtime outcome when the same name exists at both `export_scope`
/// and the other scope, given the tool's behavior. `show-both` / `merge-all`
/// keep both copies; otherwise (last-wins) the scope favored by `precedence`
/// wins, so the exported copy wins iff it is written at the winning scope.
pub fn classify(
    precedence: Precedence,
    duplicate: DuplicateNameBehavior,
    export_scope: ExportScope,
) -> RuntimeConflictKind {
    if duplicate == DuplicateNameBehavior::ShowBoth || precedence == Precedence::MergeAll {
        return RuntimeConflictKind::BothActive;
    }
    let winning_scope = match precedence {
        Precedence::ProjectFirst => ExportScope::Project,
        Precedence::UserFirst => ExportScope::Global,
        // Handled above; keep the match total and fail safe to "both active".
        Precedence::MergeAll => return RuntimeConflictKind::BothActive,
    };
    if export_scope == winning_scope {
        RuntimeConflictKind::ExportedWins
    } else {
        RuntimeConflictKind::ExistingWins
    }
}

/// Detect a runtime conflict for one exported skill against `adapter`'s OTHER
/// scope locations. Returns `Some` when a same-named skill already exists at a
/// scope the tool reads besides `export_scope` (so the tool will face two copies
/// at runtime); `None` otherwise. Name matching defers to the filesystem, so it
/// is case-insensitive on Windows, consistent with the TargetExists check.
pub fn detect_runtime_conflict(
    adapter: &ToolAdapter,
    export_scope: ExportScope,
    exported_name: &str,
    target_project_path: &Path,
    home_dir: &Path,
    target_index: u32,
) -> Option<RuntimeConflict> {
    let other = other_scope(export_scope);
    let other_roots = resolve_destination_roots(adapter, other, target_project_path, home_dir);
    let exists_elsewhere = other_roots
        .iter()
        .any(|root| root.join(exported_name).exists());
    if !exists_elsewhere {
        return None;
    }
    Some(RuntimeConflict {
        exported_name: exported_name.to_string(),
        kind: classify(
            adapter.precedence,
            adapter.duplicate_name_behavior,
            export_scope,
        ),
        target_index,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use agentmix_types::{ReloadBehavior, ToolId};

    /// A synthetic adapter with the behavior under test. Uses `ToolId::Custom`
    /// deliberately: the per-tool lint forbids naming a built-in id here, and the
    /// detection logic reads only behavior + path fields, never the id.
    fn adapter(
        precedence: Precedence,
        duplicate: DuplicateNameBehavior,
        project_paths: &[&str],
        user_paths: &[&str],
    ) -> ToolAdapter {
        ToolAdapter {
            id: ToolId::Custom,
            display_name: "Test".to_string(),
            project_paths: project_paths.iter().map(|s| s.to_string()).collect(),
            user_paths: user_paths.iter().map(|s| s.to_string()).collect(),
            admin_paths: Vec::new(),
            precedence,
            duplicate_name_behavior: duplicate,
            reload_behavior: ReloadBehavior::RestartRequired,
        }
    }

    #[test]
    fn classify_show_both_keeps_both_active() {
        assert_eq!(
            classify(
                Precedence::MergeAll,
                DuplicateNameBehavior::ShowBoth,
                ExportScope::Project
            ),
            RuntimeConflictKind::BothActive
        );
    }

    #[test]
    fn classify_project_first_exported_at_project_wins() {
        assert_eq!(
            classify(
                Precedence::ProjectFirst,
                DuplicateNameBehavior::LastWins,
                ExportScope::Project
            ),
            RuntimeConflictKind::ExportedWins
        );
    }

    #[test]
    fn classify_project_first_exported_at_global_is_shadowed() {
        // The existing project copy outranks the global one we are writing.
        assert_eq!(
            classify(
                Precedence::ProjectFirst,
                DuplicateNameBehavior::LastWins,
                ExportScope::Global
            ),
            RuntimeConflictKind::ExistingWins
        );
    }

    #[test]
    fn detect_is_none_when_no_duplicate_at_the_other_scope() {
        let tmp = tempfile::tempdir().unwrap();
        let a = adapter(
            Precedence::ProjectFirst,
            DuplicateNameBehavior::LastWins,
            &[".x/skills"],
            &[".x/skills"],
        );
        // Nothing exists at the global location, so a project export is clean.
        assert!(detect_runtime_conflict(
            &a,
            ExportScope::Project,
            "foo",
            tmp.path(),
            tmp.path(),
            0
        )
        .is_none());
    }

    #[test]
    fn detect_flags_a_same_name_skill_at_the_global_scope() {
        let tmp = tempfile::tempdir().unwrap();
        let home = tmp.path().join("home");
        // The user already has `foo` at the global location the tool reads.
        std::fs::create_dir_all(home.join(".x/skills/foo")).unwrap();
        let a = adapter(
            Precedence::ProjectFirst,
            DuplicateNameBehavior::LastWins,
            &[".x/skills"],
            &[".x/skills"],
        );
        let got =
            detect_runtime_conflict(&a, ExportScope::Project, "foo", tmp.path(), &home, 2).unwrap();
        assert_eq!(got.exported_name, "foo");
        // Project-first + last-wins, exported at project: the export wins.
        assert_eq!(got.kind, RuntimeConflictKind::ExportedWins);
        assert_eq!(got.target_index, 2);
    }
}
