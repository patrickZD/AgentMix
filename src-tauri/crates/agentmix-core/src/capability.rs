//! Cross-tool capability linter (DESIGN.md §1.10).
//!
//! A skill's SKILL.md frontmatter may use fields a target tool does not fully
//! support — e.g. `allowed-tools` is native to Claude Code but ignored by Cursor.
//! The embedded `compatibility-matrix.json` records each tool's status for such
//! fields (supported / ignored / error / experimental). Before export, each
//! selected skill's fields are compared against the matrix for each target tool;
//! a non-`supported` status becomes a warning. Warning-level only — capability
//! notes never block export (the sole blocker remains ExportConflict).
//!
//! The matrix is a flat, PR-friendly list: one `{tool, field, status}` row each,
//! so a support change is a one-line edit. A `(tool, field)` pair absent from the
//! matrix defaults to `Supported` (standard fields like `name` / `description`
//! need no rows). v0.2.0 ships this embedded snapshot only; remote refresh and
//! the freshness UI are deferred to a networked milestone (open question 1).
//!
//! Like the rest of the pipeline this stays adapter-pure: it compares a tool id
//! passed in as data against the matrix rows and never hard-branches on a
//! concrete tool.

use std::sync::OnceLock;

use agentmix_types::{CapabilityStatus, CapabilityWarning, ToolId};
use serde::Deserialize;

/// The embedded baseline matrix (the single source of truth for built-in tools).
const MATRIX_JSON: &str = include_str!("compatibility-matrix.json");

/// One flat matrix row: how `tool` treats SKILL.md `field`.
#[derive(Debug, Deserialize)]
struct MatrixEntry {
    tool: ToolId,
    field: String,
    status: CapabilityStatus,
}

/// The matrix envelope, carrying the capture date for a later remote-refresh
/// freshness comparison (DESIGN.md §1.10; deferred).
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct Matrix {
    data_date: String,
    entries: Vec<MatrixEntry>,
}

/// Parse the embedded matrix exactly once.
fn matrix() -> &'static Matrix {
    static MATRIX: OnceLock<Matrix> = OnceLock::new();
    MATRIX.get_or_init(|| {
        // Embedded at build time: a parse failure is a bug in the shipped data,
        // not a runtime input error — fail loudly.
        serde_json::from_str(MATRIX_JSON).expect("embedded compatibility-matrix.json must be valid")
    })
}

/// The date the embedded matrix was captured (DESIGN.md §1.10). Carried for the
/// freshness comparison a remote refresh adds later (deferred).
pub fn matrix_data_date() -> &'static str {
    &matrix().data_date
}

/// How `tool` treats SKILL.md `field`. A pair with no matrix row defaults to
/// `Supported`, so standard fields and unlisted tools never warn.
pub fn field_status(tool: ToolId, field: &str) -> CapabilityStatus {
    matrix()
        .entries
        .iter()
        .find(|e| e.tool == tool && e.field == field)
        .map(|e| e.status)
        .unwrap_or(CapabilityStatus::Supported)
}

/// Any status other than `Supported` warrants a warning (DESIGN.md §1.10:
/// ignored / error / experimental all surface).
fn warrants_warning(status: CapabilityStatus) -> bool {
    status != CapabilityStatus::Supported
}

/// Lint one skill's frontmatter `fields` against `tool`, producing a warning per
/// field the tool does not fully support. `exported_name` and `target_index`
/// label each warning for the preview.
pub fn lint_fields(
    exported_name: &str,
    fields: &[String],
    tool: ToolId,
    target_index: u32,
) -> Vec<CapabilityWarning> {
    fields
        .iter()
        .filter_map(|field| {
            let status = field_status(tool, field);
            warrants_warning(status).then(|| CapabilityWarning {
                exported_name: exported_name.to_string(),
                field: field.clone(),
                status,
                target_index,
            })
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn matrix_parses_with_a_complete_allowed_tools_row() {
        // Schema sanity (§1.10): the one known field has a row per built-in tool —
        // exactly one `supported` (the tool whose field it is) and four `ignored`.
        // Asserted structurally so this test names no concrete tool id (the
        // per-tool lint forbids built-in literals in this crate's src).
        assert!(!matrix_data_date().is_empty());
        let rows: Vec<_> = matrix()
            .entries
            .iter()
            .filter(|e| e.field == "allowed-tools")
            .collect();
        assert_eq!(rows.len(), 5, "one allowed-tools row per built-in tool");
        let supported = rows
            .iter()
            .filter(|e| e.status == CapabilityStatus::Supported)
            .count();
        let ignored = rows
            .iter()
            .filter(|e| e.status == CapabilityStatus::Ignored)
            .count();
        assert_eq!(supported, 1);
        assert_eq!(ignored, 4);
    }

    #[test]
    fn unknown_pair_defaults_to_supported() {
        // Custom is not in the matrix, and `description` is a standard field, so
        // neither warns. Custom is used deliberately: a built-in literal here
        // would trip the per-tool lint (the real tool lookups are e2e-tested).
        assert_eq!(
            field_status(ToolId::Custom, "allowed-tools"),
            CapabilityStatus::Supported
        );
        assert_eq!(
            field_status(ToolId::Custom, "description"),
            CapabilityStatus::Supported
        );
    }

    #[test]
    fn only_non_supported_statuses_warrant_a_warning() {
        assert!(!warrants_warning(CapabilityStatus::Supported));
        assert!(warrants_warning(CapabilityStatus::Ignored));
        assert!(warrants_warning(CapabilityStatus::Error));
        assert!(warrants_warning(CapabilityStatus::Experimental));
    }

    #[test]
    fn lint_skips_supported_fields() {
        // All fields supported (Custom + standard fields) -> no warnings.
        let fields = vec!["name".to_string(), "description".to_string()];
        assert!(lint_fields("code-review", &fields, ToolId::Custom, 0).is_empty());
    }
}
