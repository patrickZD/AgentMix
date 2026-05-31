//! Deterministic health checks (no AI). DESIGN.md §6.5.
//!
//! Each finding's `message` / `suggestion` carries a stable i18n key (not raw
//! prose); the frontend localizes via t(key). This keeps user-visible health
//! text on the i18n path while leaving the HealthIssue shape unchanged. `field`
//! stays the literal SKILL.md frontmatter key (an English spec term).

use agentmix_types::{HealthIssue, HealthLevel, HealthStatus};

use crate::parser::{ParsedFrontmatter, DESCRIPTION_MAX_LEN, NAME_MAX_LEN};

/// Trigger-phrase keywords (multi-lingual). A description matching none of these
/// gets a warning to add a "when to use" trigger (DESIGN.md §6.5, §9.3).
const TRIGGER_KEYWORDS: &[&str] = &["when", "trigger", "用于", "当", "使用时", "需要", "适用"];

fn issue(level: HealthLevel, field: &str, message: &str, suggestion: &str) -> HealthIssue {
    HealthIssue {
        level,
        field: field.to_string(),
        message: message.to_string(),
        suggestion: Some(suggestion.to_string()),
    }
}

/// Run the deterministic checks for one Skill's parsed frontmatter against its
/// directory name and whether it bundles scripts. Returns the overall status
/// plus every finding. Error-level findings mean the Skill is unusable (these
/// match the `invalid` classification); warnings may still affect Agent
/// activation but do not block export.
pub fn check_health(
    fm: &ParsedFrontmatter,
    dir_name: &str,
    has_scripts: bool,
) -> (HealthStatus, Vec<HealthIssue>) {
    // Absent or unparseable frontmatter is fatal; no field check is meaningful.
    if !fm.parse_ok {
        return (
            HealthStatus::Error,
            vec![issue(
                HealthLevel::Error,
                "frontmatter",
                "health.frontmatterInvalid",
                "health.frontmatterInvalidFix",
            )],
        );
    }

    let mut issues = Vec::new();
    check_name(fm, dir_name, &mut issues);
    check_description(fm, &mut issues);
    check_scripts(fm, has_scripts, &mut issues);

    (overall_status(&issues), issues)
}

fn check_name(fm: &ParsedFrontmatter, dir_name: &str, issues: &mut Vec<HealthIssue>) {
    let Some(name) = fm.name.as_deref().filter(|n| !n.is_empty()) else {
        issues.push(issue(
            HealthLevel::Error,
            "name",
            "health.nameMissing",
            "health.nameMissingFix",
        ));
        return;
    };
    if !name.eq_ignore_ascii_case(dir_name) {
        issues.push(issue(
            HealthLevel::Error,
            "name",
            "health.nameMismatch",
            "health.nameMismatchFix",
        ));
    }
    if name.chars().count() > NAME_MAX_LEN {
        issues.push(issue(
            HealthLevel::Warning,
            "name",
            "health.nameTooLong",
            "health.nameTooLongFix",
        ));
    }
    if !is_kebab_case(name) {
        issues.push(issue(
            HealthLevel::Warning,
            "name",
            "health.nameFormat",
            "health.nameFormatFix",
        ));
    }
}

fn check_description(fm: &ParsedFrontmatter, issues: &mut Vec<HealthIssue>) {
    let Some(desc) = fm.description.as_deref().filter(|d| !d.is_empty()) else {
        issues.push(issue(
            HealthLevel::Error,
            "description",
            "health.descriptionMissing",
            "health.descriptionMissingFix",
        ));
        return;
    };
    if desc.chars().count() > DESCRIPTION_MAX_LEN {
        issues.push(issue(
            HealthLevel::Warning,
            "description",
            "health.descriptionTooLong",
            "health.descriptionTooLongFix",
        ));
    }
    if !has_trigger_phrase(desc) {
        issues.push(issue(
            HealthLevel::Warning,
            "description",
            "health.descriptionNoTrigger",
            "health.descriptionNoTriggerFix",
        ));
    }
}

fn check_scripts(fm: &ParsedFrontmatter, has_scripts: bool, issues: &mut Vec<HealthIssue>) {
    let declares_compat = fm.compatibility.as_deref().is_some_and(|c| !c.is_empty());
    if has_scripts && !declares_compat {
        issues.push(issue(
            HealthLevel::Warning,
            "compatibility",
            "health.scriptsNoCompatibility",
            "health.scriptsNoCompatibilityFix",
        ));
    }
}

fn overall_status(issues: &[HealthIssue]) -> HealthStatus {
    if issues.iter().any(|i| i.level == HealthLevel::Error) {
        HealthStatus::Error
    } else if issues.is_empty() {
        HealthStatus::Ok
    } else {
        HealthStatus::Warning
    }
}

/// Spec name format: lowercase letters, digits and single interior hyphens.
fn is_kebab_case(name: &str) -> bool {
    !name.is_empty()
        && !name.starts_with('-')
        && !name.ends_with('-')
        && !name.contains("--")
        && name
            .chars()
            .all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || c == '-')
}

fn has_trigger_phrase(description: &str) -> bool {
    let lower = description.to_lowercase();
    TRIGGER_KEYWORDS.iter().any(|kw| lower.contains(kw))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn fm(name: &str, description: &str) -> ParsedFrontmatter {
        ParsedFrontmatter {
            name: Some(name.to_string()),
            description: Some(description.to_string()),
            parse_ok: true,
            ..Default::default()
        }
    }

    fn has(issues: &[HealthIssue], message: &str, level: HealthLevel) -> bool {
        issues
            .iter()
            .any(|i| i.message == message && i.level == level)
    }

    #[test]
    fn healthy_skill_has_ok_status_and_no_issues() {
        // Matches dir, kebab name, description with a trigger phrase.
        let (status, issues) = check_health(
            &fm("code-review", "Use when you need a thorough code review."),
            "code-review",
            false,
        );
        assert_eq!(status, HealthStatus::Ok);
        assert!(issues.is_empty());
    }

    #[test]
    fn unparseable_frontmatter_is_a_single_fatal_error() {
        let bad = ParsedFrontmatter {
            parse_ok: false,
            ..Default::default()
        };
        let (status, issues) = check_health(&bad, "anything", false);
        assert_eq!(status, HealthStatus::Error);
        assert_eq!(issues.len(), 1);
        assert!(has(
            &issues,
            "health.frontmatterInvalid",
            HealthLevel::Error
        ));
    }

    #[test]
    fn missing_name_is_an_error() {
        let f = ParsedFrontmatter {
            description: Some("Use when reviewing.".into()),
            parse_ok: true,
            ..Default::default()
        };
        let (status, issues) = check_health(&f, "code-review", false);
        assert_eq!(status, HealthStatus::Error);
        assert!(has(&issues, "health.nameMissing", HealthLevel::Error));
    }

    #[test]
    fn name_not_matching_directory_is_an_error() {
        let (status, issues) = check_health(
            &fm("wrong-name", "Use when reviewing."),
            "code-review",
            false,
        );
        assert_eq!(status, HealthStatus::Error);
        assert!(has(&issues, "health.nameMismatch", HealthLevel::Error));
    }

    #[test]
    fn non_kebab_name_is_a_warning_only() {
        // Underscore name matches dir case-insensitively but is not kebab-case.
        let (status, issues) = check_health(
            &fm("code_review", "Use when reviewing."),
            "code_review",
            false,
        );
        assert_eq!(status, HealthStatus::Warning);
        assert!(has(&issues, "health.nameFormat", HealthLevel::Warning));
        assert!(!has(&issues, "health.nameMismatch", HealthLevel::Error));
    }

    #[test]
    fn over_length_name_is_a_warning() {
        let long = "a".repeat(NAME_MAX_LEN + 1);
        let (_, issues) = check_health(&fm(&long, "Use when reviewing."), &long, false);
        assert!(has(&issues, "health.nameTooLong", HealthLevel::Warning));
    }

    #[test]
    fn missing_description_is_an_error() {
        let f = ParsedFrontmatter {
            name: Some("code-review".into()),
            parse_ok: true,
            ..Default::default()
        };
        let (status, issues) = check_health(&f, "code-review", false);
        assert_eq!(status, HealthStatus::Error);
        assert!(has(
            &issues,
            "health.descriptionMissing",
            HealthLevel::Error
        ));
    }

    #[test]
    fn description_without_trigger_phrase_is_a_warning() {
        let (status, issues) = check_health(
            &fm("code-review", "Reviews source code thoroughly."),
            "code-review",
            false,
        );
        assert_eq!(status, HealthStatus::Warning);
        assert!(has(
            &issues,
            "health.descriptionNoTrigger",
            HealthLevel::Warning
        ));
    }

    #[test]
    fn chinese_trigger_phrase_is_accepted() {
        let (status, issues) = check_health(
            &fm("code-review", "用于审查代码质量。"),
            "code-review",
            false,
        );
        assert_eq!(status, HealthStatus::Ok);
        assert!(issues.is_empty());
    }

    #[test]
    fn over_length_description_is_a_warning() {
        let long = format!("Use when {}", "x".repeat(DESCRIPTION_MAX_LEN));
        let (_, issues) = check_health(&fm("code-review", &long), "code-review", false);
        assert!(has(
            &issues,
            "health.descriptionTooLong",
            HealthLevel::Warning
        ));
    }

    #[test]
    fn scripts_without_compatibility_is_a_warning() {
        let (status, issues) = check_health(&fm("deploy", "Use when deploying."), "deploy", true);
        assert_eq!(status, HealthStatus::Warning);
        assert!(has(
            &issues,
            "health.scriptsNoCompatibility",
            HealthLevel::Warning
        ));
    }

    #[test]
    fn scripts_with_compatibility_has_no_script_warning() {
        let f = ParsedFrontmatter {
            name: Some("deploy".into()),
            description: Some("Use when deploying.".into()),
            compatibility: Some("bash >= 5".into()),
            parse_ok: true,
            ..Default::default()
        };
        let (status, issues) = check_health(&f, "deploy", true);
        assert_eq!(status, HealthStatus::Ok);
        assert!(!has(
            &issues,
            "health.scriptsNoCompatibility",
            HealthLevel::Warning
        ));
    }
}
