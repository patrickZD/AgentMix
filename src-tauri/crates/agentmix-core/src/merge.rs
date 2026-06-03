//! Merge-workbench draft validation (DESIGN.md §6.3, T24).
//!
//! One function the `validate_merge_draft` command wraps. It reuses the
//! parser + health single source of truth and the exporter's safe-segment
//! rule, so the workbench's live validation and confirm gate can never drift
//! from what scan classification and export enforcement would say.

use agentmix_types::{HealthStatus, MergeDraftValidation};

use crate::exporter::is_safe_segment;
use crate::health::check_health;
use crate::parser::parse_frontmatter;

/// Validate a merge draft against the composition's existing exported names.
/// `keeps_scripts` reflects the user's scripts choice in the workbench (a kept
/// script tree without a `compatibility` field warns, same as a scanned asset).
/// Blocking = error-level health, a case-insensitive name collision, or a name
/// that cannot be the exported directory segment.
pub fn validate_merge_draft(
    draft: &str,
    existing_names: &[String],
    keeps_scripts: bool,
) -> MergeDraftValidation {
    let fm = parse_frontmatter(draft);
    let name = fm.name.clone().unwrap_or_default();
    // The draft's own name IS the exported directory name, so the health
    // name-vs-directory check is keyed to itself (a mismatch cannot happen;
    // the remaining name checks — missing/format/length — still apply).
    let (health_status, issues) = check_health(&fm, &name, keeps_scripts);

    let name_collision =
        !name.is_empty() && existing_names.iter().any(|n| n.eq_ignore_ascii_case(&name));
    let name_unsafe = !is_safe_segment(&name);
    let can_confirm = health_status != HealthStatus::Error && !name_collision && !name_unsafe;

    MergeDraftValidation {
        health_status,
        issues,
        name_collision,
        name_unsafe,
        parsed_name: fm.name,
        can_confirm,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use agentmix_types::HealthLevel;

    const VALID_DRAFT: &str =
        "---\nname: merged-review\ndescription: Use when reviewing merged code.\n---\n## Body\n";

    fn names(list: &[&str]) -> Vec<String> {
        list.iter().map(|s| s.to_string()).collect()
    }

    #[test]
    fn valid_draft_with_unique_name_can_confirm() {
        let v = validate_merge_draft(VALID_DRAFT, &names(&["other-skill"]), false);
        assert_eq!(v.health_status, HealthStatus::Ok);
        assert!(v.issues.is_empty());
        assert!(!v.name_collision);
        assert!(!v.name_unsafe);
        assert_eq!(v.parsed_name.as_deref(), Some("merged-review"));
        assert!(v.can_confirm);
    }

    #[test]
    fn unparseable_yaml_blocks_confirmation() {
        let v = validate_merge_draft("---\nname: [unclosed\n---\nbody", &[], false);
        assert_eq!(v.health_status, HealthStatus::Error);
        assert!(!v.can_confirm);
    }

    #[test]
    fn missing_name_blocks_confirmation() {
        let v = validate_merge_draft("---\ndescription: Use when x.\n---\n", &[], false);
        assert_eq!(v.health_status, HealthStatus::Error);
        assert!(v.issues.iter().any(|i| i.field == "name"));
        assert!(!v.can_confirm);
    }

    #[test]
    fn missing_description_blocks_confirmation() {
        let v = validate_merge_draft("---\nname: merged-review\n---\n", &[], false);
        assert!(v
            .issues
            .iter()
            .any(|i| i.field == "description" && i.level == HealthLevel::Error));
        assert!(!v.can_confirm);
    }

    #[test]
    fn name_collision_with_composition_blocks_confirmation_case_insensitively() {
        let v = validate_merge_draft(VALID_DRAFT, &names(&["Merged-Review"]), false);
        assert!(v.name_collision);
        assert!(!v.can_confirm);
        // Health itself is fine — only the collision blocks.
        assert_eq!(v.health_status, HealthStatus::Ok);
    }

    #[test]
    fn over_64_char_name_is_unsafe_and_blocks() {
        let long = "a".repeat(65);
        let draft = format!("---\nname: {long}\ndescription: Use when x.\n---\n");
        let v = validate_merge_draft(&draft, &[], false);
        assert!(v.name_unsafe);
        assert!(!v.can_confirm);
    }

    #[test]
    fn warnings_do_not_block_confirmation() {
        // Over-long description (> 1024) is a warning, not a blocker — the
        // confirm gate matches the export gate, which does not block warnings.
        let long_desc = "x".repeat(1025);
        let draft = format!("---\nname: merged-review\ndescription: {long_desc}\n---\n");
        let v = validate_merge_draft(&draft, &[], false);
        assert_eq!(v.health_status, HealthStatus::Warning);
        assert!(v
            .issues
            .iter()
            .any(|i| i.message == "health.descriptionTooLong"));
        assert!(v.can_confirm);
    }

    #[test]
    fn kept_scripts_without_compatibility_warns_but_confirms() {
        let v = validate_merge_draft(VALID_DRAFT, &[], true);
        assert!(v
            .issues
            .iter()
            .any(|i| i.message == "health.scriptsNoCompatibility"));
        assert!(v.can_confirm);
    }
}
