//! Cross-end data models — the single source of truth for shared types.
//!
//! These Rust definitions generate `src/types/generated.ts` via the headless
//! `export-bindings` binary (specta + specta-typescript). The crate is
//! deliberately tauri-free so type generation runs in CI without the WebView2
//! runtime. v0.1 defines the scan + health core here; export-pipeline models
//! (ExportPlan, FileOperation, BackupPlan, ...) are added in their own slices
//! (T11+) when the commands that use them exist.

use serde::{Deserialize, Serialize};
use specta::Type;
use std::collections::HashMap;

/// Kinds of composable asset. v0.1 ships only `Skill`; new members extend later.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Type)]
#[serde(rename_all = "kebab-case")]
pub enum AssetKind {
    Skill,
}

/// Three-way scan classification (DESIGN.md §6.1).
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Type)]
#[serde(rename_all = "kebab-case")]
pub enum AssetCategory {
    /// Spec-compliant and free of tool-specific fields.
    Portable,
    /// Spec-compliant but uses experimental / tool-specific fields.
    ToolSpecific,
    /// Missing name/description, name/dir mismatch, or YAML parse failure.
    Invalid,
}

/// Severity of a single deterministic health finding.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Type)]
#[serde(rename_all = "lowercase")]
pub enum HealthLevel {
    Warning,
    Error,
}

/// Overall deterministic health of an asset.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Type)]
#[serde(rename_all = "lowercase")]
pub enum HealthStatus {
    Ok,
    Warning,
    Error,
}

/// A single deterministic health finding (no AI involved).
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct HealthIssue {
    pub level: HealthLevel,
    /// Field the issue concerns, e.g. "name" or "description".
    pub field: String,
    pub message: String,
    pub suggestion: Option<String>,
}

/// A Skill asset discovered by scanning — the concrete v0.1 provider of the
/// Asset abstraction. The Asset-level fields (id, kind, identityKey,
/// sourceProjectId, healthStatus, healthIssues) are flattened in here.
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct Skill {
    pub id: String,
    pub kind: AssetKind,
    /// Unique within a scope; for a Skill this is its `name`.
    pub identity_key: String,
    pub source_project_id: String,
    pub category: AssetCategory,
    pub health_status: HealthStatus,
    pub health_issues: Vec<HealthIssue>,
    pub name: String,
    pub description: String,
    pub compatibility: Option<String>,
    pub metadata: Option<HashMap<String, String>>,
    pub skill_dir_path: String,
    pub relative_path_in_project: String,
    pub has_scripts: bool,
    pub skill_md_content: String,
}

/// A source project (folder) that was scanned for assets.
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct SourceProject {
    pub id: String,
    pub name: String,
    pub root_path: String,
    pub is_git_repo: bool,
    /// Timestamp (Unix epoch milliseconds, as a string) of when this project was scanned.
    pub detected_at: String,
    /// Timestamp (Unix epoch milliseconds, as a string) of the most recent update check, if any.
    pub last_checked_at: Option<String>,
    pub skills: Vec<Skill>,
}
