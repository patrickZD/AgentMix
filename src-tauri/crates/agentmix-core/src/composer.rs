//! Composition + export-conflict detection (DESIGN.md §6.2, §8.3).
//!
//! v0.1 targets a single directory (Claude Code project-level `.claude/skills/`),
//! so the four-dimension ExportConflict key (tool, scope, path, exported_name)
//! collapses to the exported name alone. Detection works on `ConflictCandidate`
//! (id + exported name) and never branches on a concrete asset type, keeping the
//! pipeline asset-kind-agnostic.

use std::collections::HashMap;

use agentmix_types::{ConflictCandidate, ExportConflict};

/// Detect v0.1 export conflicts: candidates whose exported name collides
/// case-insensitively (Windows rule, DESIGN.md §9.8). Returns one
/// `ExportConflict` per colliding name (>= 2 candidates), in first-seen order.
pub fn detect_export_conflicts(candidates: &[ConflictCandidate]) -> Vec<ExportConflict> {
    // Group ids by the normalized (lowercased) name, preserving first-seen order
    // and the original-cased name for display.
    let mut order: Vec<String> = Vec::new();
    let mut groups: HashMap<String, (String, Vec<String>)> = HashMap::new();

    for candidate in candidates {
        let key = candidate.exported_name.to_lowercase();
        let entry = groups.entry(key.clone()).or_insert_with(|| {
            order.push(key.clone());
            (candidate.exported_name.clone(), Vec::new())
        });
        entry.1.push(candidate.id.clone());
    }

    order
        .into_iter()
        .filter_map(|key| {
            let (name, ids) = groups.remove(&key)?;
            (ids.len() >= 2).then_some(ExportConflict {
                exported_name: name,
                asset_ids: ids,
            })
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn candidate(id: &str, exported_name: &str) -> ConflictCandidate {
        ConflictCandidate {
            id: id.to_string(),
            exported_name: exported_name.to_string(),
        }
    }

    #[test]
    fn two_identical_names_collide() {
        let conflicts = detect_export_conflicts(&[
            candidate("a", "code-review"),
            candidate("b", "code-review"),
        ]);
        assert_eq!(conflicts.len(), 1);
        assert_eq!(conflicts[0].exported_name, "code-review");
        assert_eq!(conflicts[0].asset_ids, vec!["a", "b"]);
    }

    #[test]
    fn collision_is_case_insensitive() {
        // "Code-Review" vs "code-review" must be treated as the same name.
        let conflicts = detect_export_conflicts(&[
            candidate("a", "Code-Review"),
            candidate("b", "code-review"),
        ]);
        assert_eq!(conflicts.len(), 1);
        assert_eq!(conflicts[0].asset_ids, vec!["a", "b"]);
    }

    #[test]
    fn distinct_names_do_not_collide() {
        let conflicts = detect_export_conflicts(&[
            candidate("a", "code-review"),
            candidate("b", "test-writer"),
        ]);
        assert!(conflicts.is_empty());
    }

    #[test]
    fn three_way_collision_lists_all_ids() {
        let conflicts = detect_export_conflicts(&[
            candidate("a", "deploy"),
            candidate("b", "deploy"),
            candidate("c", "DEPLOY"),
        ]);
        assert_eq!(conflicts.len(), 1);
        assert_eq!(conflicts[0].asset_ids, vec!["a", "b", "c"]);
    }

    #[test]
    fn independent_collisions_are_reported_separately() {
        let conflicts = detect_export_conflicts(&[
            candidate("a", "deploy"),
            candidate("b", "review"),
            candidate("c", "deploy"),
            candidate("d", "review"),
        ]);
        assert_eq!(conflicts.len(), 2);
        // First-seen order: deploy group before review group.
        assert_eq!(conflicts[0].exported_name, "deploy");
        assert_eq!(conflicts[0].asset_ids, vec!["a", "c"]);
        assert_eq!(conflicts[1].exported_name, "review");
        assert_eq!(conflicts[1].asset_ids, vec!["b", "d"]);
    }

    #[test]
    fn a_renamed_candidate_no_longer_collides() {
        // After resolving by rename, the exported names differ -> no conflict.
        let conflicts = detect_export_conflicts(&[
            candidate("a", "code-review"),
            candidate("b", "code-review-vercel"),
        ]);
        assert!(conflicts.is_empty());
    }

    #[test]
    fn single_or_empty_selection_has_no_conflict() {
        assert!(detect_export_conflicts(&[]).is_empty());
        assert!(detect_export_conflicts(&[candidate("a", "code-review")]).is_empty());
    }
}
