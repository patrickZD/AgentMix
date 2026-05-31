//! Recursive directory scanning and SKILL.md discovery (DESIGN.md §6.1).

use std::path::Path;
use std::time::{SystemTime, UNIX_EPOCH};

use agentmix_types::{AssetKind, HealthStatus, Skill, SourceProject};
use walkdir::{DirEntry, WalkDir};

use crate::parser::{classify, parse_frontmatter};

/// Default recursion depth; callers may raise it up to MAX_SCAN_DEPTH.
pub const DEFAULT_SCAN_DEPTH: usize = 5;
pub const MAX_SCAN_DEPTH: usize = 8;

const SKILL_FILE: &str = "SKILL.md";
/// Directories never descended into during a scan.
const SKIP_DIRS: &[&str] = &[".git", "node_modules", "target"];

/// Scan a project directory at the default depth.
pub fn scan_project(root: &Path) -> SourceProject {
    scan_project_with_depth(root, DEFAULT_SCAN_DEPTH)
}

/// Scan a project directory for SKILL.md files and build a SourceProject.
/// Symlinks are not followed; the skip-list directories are pruned.
pub fn scan_project_with_depth(root: &Path, depth: usize) -> SourceProject {
    let depth = depth.min(MAX_SCAN_DEPTH);
    let root_path = root.to_string_lossy().to_string();
    let project_id = project_id_for(&root_path);
    let project_name = root
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_else(|| root_path.clone());
    let is_git_repo = root.join(".git").exists();

    let mut skills: Vec<Skill> = WalkDir::new(root)
        .max_depth(depth)
        .follow_links(false)
        .into_iter()
        .filter_entry(|e| !is_skipped_dir(e))
        .filter_map(Result::ok)
        .filter(|e| e.file_type().is_file() && is_skill_file(e))
        .filter_map(|e| build_skill(e.path(), root, &project_id))
        .collect();

    // Stable, path-sorted order so the UI and tests are deterministic.
    skills.sort_by(|a, b| a.relative_path_in_project.cmp(&b.relative_path_in_project));

    SourceProject {
        id: project_id,
        name: project_name,
        root_path,
        is_git_repo,
        detected_at: now_timestamp(),
        last_checked_at: None,
        skills,
    }
}

fn is_skill_file(e: &DirEntry) -> bool {
    e.file_name()
        .to_str()
        .map(|n| n.eq_ignore_ascii_case(SKILL_FILE))
        .unwrap_or(false)
}

fn is_skipped_dir(e: &DirEntry) -> bool {
    e.file_type().is_dir()
        && e.file_name()
            .to_str()
            .map(|n| SKIP_DIRS.contains(&n))
            .unwrap_or(false)
}

fn build_skill(skill_md: &Path, root: &Path, project_id: &str) -> Option<Skill> {
    let skill_dir = skill_md.parent()?;
    let dir_name = skill_dir.file_name()?.to_string_lossy().to_string();
    let content = std::fs::read_to_string(skill_md).ok()?;

    let fm = parse_frontmatter(&content);
    let category = classify(&fm, &dir_name);

    let name = fm.name.clone().unwrap_or_else(|| dir_name.clone());
    let description = fm.description.clone().unwrap_or_default();
    let rel = skill_dir
        .strip_prefix(root)
        .unwrap_or(skill_dir)
        .to_string_lossy()
        .replace('\\', "/");
    let has_scripts = skill_dir.join("scripts").is_dir();

    Some(Skill {
        id: format!("{project_id}:{rel}"),
        kind: AssetKind::Skill,
        identity_key: name.clone(),
        source_project_id: project_id.to_string(),
        category,
        // Deterministic health is computed in T9; default to Ok/none for now.
        health_status: HealthStatus::Ok,
        health_issues: Vec::new(),
        name,
        description,
        compatibility: fm.compatibility.clone(),
        metadata: fm.metadata.clone(),
        skill_dir_path: skill_dir.to_string_lossy().to_string(),
        relative_path_in_project: rel,
        has_scripts,
        skill_md_content: content,
    })
}

/// Stable id derived from the normalized (lowercased) path via FNV-1a.
fn project_id_for(root_path: &str) -> String {
    let mut hash: u64 = 0xcbf29ce484222325;
    for b in root_path.to_lowercase().bytes() {
        hash ^= b as u64;
        hash = hash.wrapping_mul(0x100000001b3);
    }
    format!("proj-{hash:016x}")
}

/// Unix-epoch milliseconds as a string. Lightweight; avoids a date dependency.
fn now_timestamp() -> String {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis().to_string())
        .unwrap_or_else(|_| "0".to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    use agentmix_types::AssetCategory;

    fn write_skill(root: &Path, dir: &str, content: &str) {
        let d = root.join(dir);
        std::fs::create_dir_all(&d).unwrap();
        std::fs::write(d.join("SKILL.md"), content).unwrap();
    }

    #[test]
    fn scans_and_classifies_three_categories() {
        let tmp = tempfile::tempdir().unwrap();
        let root = tmp.path();
        write_skill(
            root,
            "code-review",
            "---\nname: code-review\ndescription: Reviews code.\n---\nbody",
        );
        write_skill(
            root,
            "deploy",
            "---\nname: deploy\ndescription: Deploys.\nallowed-tools:\n  - Bash\n---\nbody",
        );
        write_skill(
            root,
            "broken",
            "---\nname: wrong-name\ndescription: Mismatch.\n---\nbody",
        );

        let project = scan_project(root);

        assert_eq!(project.skills.len(), 3);
        let find = |rel: &str| {
            project
                .skills
                .iter()
                .find(|s| s.relative_path_in_project == rel)
                .unwrap()
        };
        assert_eq!(find("code-review").category, AssetCategory::Portable);
        assert_eq!(find("deploy").category, AssetCategory::ToolSpecific);
        assert_eq!(find("broken").category, AssetCategory::Invalid);
    }

    #[test]
    fn skips_node_modules_and_git() {
        let tmp = tempfile::tempdir().unwrap();
        let root = tmp.path();
        write_skill(
            root,
            "node_modules/pkg",
            "---\nname: pkg\ndescription: x.\n---\n",
        );
        write_skill(
            root,
            ".git/hooks",
            "---\nname: hooks\ndescription: x.\n---\n",
        );
        write_skill(
            root,
            "real-skill",
            "---\nname: real-skill\ndescription: x.\n---\n",
        );

        let project = scan_project(root);

        assert_eq!(project.skills.len(), 1);
        assert_eq!(project.skills[0].name, "real-skill");
    }

    #[test]
    fn detects_scripts_directory() {
        let tmp = tempfile::tempdir().unwrap();
        let root = tmp.path();
        write_skill(root, "deploy", "---\nname: deploy\ndescription: x.\n---\n");
        std::fs::create_dir_all(root.join("deploy").join("scripts")).unwrap();

        let project = scan_project(root);

        let deploy = project.skills.iter().find(|s| s.name == "deploy").unwrap();
        assert!(deploy.has_scripts);
    }

    #[test]
    fn detects_git_repo_without_scanning_git_contents() {
        let tmp = tempfile::tempdir().unwrap();
        std::fs::create_dir_all(tmp.path().join(".git")).unwrap();
        write_skill(tmp.path(), "x", "---\nname: x\ndescription: y.\n---\n");

        let project = scan_project(tmp.path());

        assert!(project.is_git_repo);
        assert_eq!(project.skills.len(), 1);
    }

    #[test]
    fn returns_empty_for_directory_without_skills() {
        let tmp = tempfile::tempdir().unwrap();
        std::fs::create_dir_all(tmp.path().join("src")).unwrap();
        std::fs::write(tmp.path().join("README.md"), "no skills here").unwrap();

        let project = scan_project(tmp.path());

        assert!(project.skills.is_empty());
    }
}
