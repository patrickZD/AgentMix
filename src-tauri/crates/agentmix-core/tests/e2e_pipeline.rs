//! Headless end-to-end tests for the v0.1 export pipeline (golden + conflict).
//!
//! These drive the real public API across crates — scan -> conflict detect ->
//! (resolve) -> build plan -> execute — against tempdir fixtures, asserting the
//! actual filesystem result and frontmatter sync rather than UI text. They run
//! headless (no WebView2/wry), unlike the WebdriverIO UI e2e under `/e2e`, so
//! they can gate CI. The UI-click-through layer is covered by that WDIO suite.

use std::path::Path;

use agentmix_core::{exporter, scanner, tool_adapters};
use agentmix_types::{
    ConflictKind, ExportItemSource, ExportPlan, ExportRequestItem, FileOperationKind, Skill,
};

/// Write a minimal valid skill (name matches its directory) under `root/dir`.
fn write_skill(root: &Path, dir: &str, name: &str, topic: &str) {
    let d = root.join(dir);
    std::fs::create_dir_all(&d).unwrap();
    std::fs::write(
        d.join("SKILL.md"),
        format!("---\nname: {name}\ndescription: Use when {topic}.\n---\n# {name}\n"),
    )
    .unwrap();
}

/// Build an export request the way the UI does: asset id + source dir + the name
/// it will be written as (defaults to the skill name; the renamed value resolves
/// a conflict).
fn item_from(skill: &Skill, exported_name: &str) -> ExportRequestItem {
    ExportRequestItem {
        asset_id: skill.id.clone(),
        source: ExportItemSource::Directory {
            dir: skill.skill_dir_path.clone(),
        },
        exported_name: exported_name.to_string(),
        source_ref: format!(
            "{}:{}",
            skill.source_project_id, skill.relative_path_in_project
        ),
    }
}

/// Build a single-target (Claude Code project) plan the way the v0.1-compat
/// command does, so the golden/conflict/merged assertions read one destination.
/// The home dir is unused for project scope.
fn cc_plan(items: &[ExportRequestItem], target_project: &Path, backups: &Path) -> ExportPlan {
    exporter::build_export_plan(
        items,
        &tool_adapters::default_targets(),
        target_project,
        Path::new("C:/home"),
        backups,
    )
}

#[test]
fn golden_path_scan_select_preview_export() {
    let tmp = tempfile::tempdir().unwrap();
    let source = tmp.path().join("source-repo");
    write_skill(&source, "code-review", "code-review", "reviewing code");
    write_skill(&source, "deploy", "deploy", "deploying a service");
    write_skill(&source, "test-gen", "test-gen", "generating tests");

    // Scan a real directory (the button-entry equivalent).
    let project = scanner::scan_project(&source);
    assert_eq!(project.skills.len(), 3);

    let items: Vec<_> = project
        .skills
        .iter()
        .map(|s| item_from(s, &s.name))
        .collect();
    let target = tmp.path().join("target-project");
    let backups = tmp.path().join("backups");

    // Dry-run preview: all create, no conflicts, nothing gated.
    let plan = cc_plan(&items, &target, &backups);
    assert!(plan.conflicts.is_empty());
    assert!(plan.backups.is_empty());
    assert!(plan
        .security_reports
        .iter()
        .all(|r| !r.requires_confirmation));
    assert!(plan
        .operations
        .iter()
        .all(|o| o.kind == FileOperationKind::Create));

    // Execute consumes the same plan (clean -> nothing to acknowledge, no overwrite).
    let report = exporter::execute(&plan, &items, &[], false).unwrap();
    assert_eq!(report.skills_exported, 3);
    assert_eq!(report.files_overwritten, 0);

    // The target now holds three complete skill subdirectories + the manifest.
    let skills_dir = target.join(".claude").join("skills");
    for name in ["code-review", "deploy", "test-gen"] {
        assert!(
            skills_dir.join(name).join("SKILL.md").is_file(),
            "missing exported skill: {name}"
        );
    }
    assert!(skills_dir.join(".agentmix-manifest.json").is_file());
}

#[test]
fn conflict_path_rename_resolves_and_syncs_frontmatter() {
    let tmp = tempfile::tempdir().unwrap();
    // Two source repos each shipping a `code-review` skill (cross-repo collision).
    let repo_a = tmp.path().join("repo-a");
    let repo_b = tmp.path().join("repo-b");
    write_skill(&repo_a, "code-review", "code-review", "reviewing code in A");
    write_skill(&repo_b, "code-review", "code-review", "reviewing code in B");
    let project_a = scanner::scan_project(&repo_a);
    let project_b = scanner::scan_project(&repo_b);
    let skill_a = &project_a.skills[0];
    let skill_b = &project_b.skills[0];

    let target = tmp.path().join("target");
    let backups = tmp.path().join("backups");

    // Both exported under the same name -> NameCollision blocks export.
    let colliding = vec![
        item_from(skill_a, "code-review"),
        item_from(skill_b, "code-review"),
    ];
    let plan = cc_plan(&colliding, &target, &backups);
    assert!(plan
        .conflicts
        .iter()
        .any(|c| c.kind == ConflictKind::NameCollision));
    assert!(exporter::execute(&plan, &colliding, &[], false).is_err());
    assert!(
        !target.join(".claude").exists(),
        "nothing may be written while a collision is unresolved"
    );

    // Resolve by renaming B's export, rebuild the plan, then export.
    let resolved = vec![
        item_from(skill_a, "code-review"),
        item_from(skill_b, "code-review-b"),
    ];
    let plan = cc_plan(&resolved, &target, &backups);
    assert!(plan.conflicts.is_empty());
    exporter::execute(&plan, &resolved, &[], false).unwrap();

    // Both skills coexist in the target.
    let skills_dir = target.join(".claude").join("skills");
    assert!(skills_dir.join("code-review").join("SKILL.md").is_file());
    let renamed = skills_dir.join("code-review-b").join("SKILL.md");
    assert!(renamed.is_file());

    // The renamed skill's frontmatter `name:` is synced to the exported value.
    let content = std::fs::read_to_string(&renamed).unwrap();
    let name_line = content
        .lines()
        .find(|l| l.trim_start().starts_with("name:"))
        .expect("renamed SKILL.md must keep a name field");
    assert_eq!(name_line.trim(), "name: code-review-b");
}

#[test]
fn merged_path_conflict_merge_resolves_and_exports_draft() {
    let tmp = tempfile::tempdir().unwrap();
    // Two source repos shipping the same `code-review` skill; one bundles scripts.
    let repo_a = tmp.path().join("repo-a");
    let repo_b = tmp.path().join("repo-b");
    write_skill(&repo_a, "code-review", "code-review", "reviewing code in A");
    write_skill(&repo_b, "code-review", "code-review", "reviewing code in B");
    std::fs::create_dir_all(repo_b.join("code-review/scripts")).unwrap();
    std::fs::write(repo_b.join("code-review/scripts/lint.sh"), "echo lint").unwrap();
    let project_a = scanner::scan_project(&repo_a);
    let project_b = scanner::scan_project(&repo_b);
    let skill_a = &project_a.skills[0];
    let skill_b = &project_b.skills[0];

    let target = tmp.path().join("target");
    let backups = tmp.path().join("backups");

    // Both selected under the same name -> NameCollision blocks export.
    let colliding = vec![
        item_from(skill_a, "code-review"),
        item_from(skill_b, "code-review"),
    ];
    let plan = cc_plan(&colliding, &target, &backups);
    assert!(plan
        .conflicts
        .iter()
        .any(|c| c.kind == ConflictKind::NameCollision));

    // Resolve via the merge workbench (v0.1.5 manual merge): the two colliding
    // items are replaced by ONE content-backed merged item whose SKILL.md is
    // the user's draft, keeping repo-b's scripts (single-choice, §1.3).
    let draft = "---\nname: code-review\ndescription: Use when reviewing code (merged from A and B).\n---\n## Merged guidance\nA body + B body\n";
    let merged = ExportRequestItem {
        asset_id: "merged-code-review".to_string(),
        source: ExportItemSource::Content {
            content: draft.to_string(),
            scripts_from_dir: Some(skill_b.skill_dir_path.clone()),
        },
        exported_name: "code-review".to_string(),
        source_ref: format!("merged:{}+{}", skill_a.id, skill_b.id),
    };
    let resolved = vec![merged];

    // The conflict is gone and the same plan object drives execution.
    let plan = cc_plan(&resolved, &target, &backups);
    assert!(plan.conflicts.is_empty());
    let report = exporter::execute(&plan, &resolved, &[], false).unwrap();
    assert_eq!(report.skills_exported, 1);

    // The target holds the merged skill: draft byte-identical, kept scripts
    // from the chosen source, and the manifest records the merged entry.
    let out = target.join(".claude").join("skills").join("code-review");
    assert_eq!(
        std::fs::read(out.join("SKILL.md")).unwrap(),
        draft.as_bytes()
    );
    assert_eq!(
        std::fs::read_to_string(out.join("scripts/lint.sh")).unwrap(),
        "echo lint"
    );
    for op in &plan.operations {
        assert_eq!(
            std::fs::metadata(&op.path).unwrap().len(),
            op.size,
            "plan/execute byte parity for {}",
            op.path
        );
    }
}
