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

/// One asset competing for a name in the export target, fed to conflict
/// detection. Kept asset-kind-agnostic: only the id and the name it would be
/// written as matter, so the pipeline never branches on a concrete asset type.
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct ConflictCandidate {
    pub id: String,
    /// The name this asset would be written as in the target directory
    /// (a Skill's `name`, or its renamed value after conflict resolution).
    pub exported_name: String,
}

/// Why an export conflict was raised (DESIGN.md §6.2). Both block export.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub enum ConflictKind {
    /// Two or more selected assets share the same exported name.
    NameCollision,
    /// A selected asset's exported name already exists in the target directory.
    TargetExists,
}

/// A v0.1 export conflict: assets that would collide on a name in the target
/// directory (compared case-insensitively). Must be resolved before export.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct ExportConflict {
    pub kind: ConflictKind,
    /// The colliding exported name, as first encountered among the candidates.
    pub exported_name: String,
    /// Ids of the candidates that collide on this name. For NameCollision this
    /// is the >= 2 selected assets; for TargetExists it is the single selected
    /// asset whose name already exists at the target.
    pub asset_ids: Vec<String>,
}

/// A single file write planned for export. Produced only by the planner; never
/// written by it. v0.1 produces Create / Overwrite (delete-on-reexport is a
/// later reconciliation concern and is not modelled yet).
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub enum FileOperationKind {
    Create,
    Overwrite,
}

/// One planned file write (DESIGN.md §8.2 FileOperation).
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct FileOperation {
    pub kind: FileOperationKind,
    /// Absolute destination path.
    pub path: String,
    /// Bytes that will be written (from the source file). Exported to TS as
    /// `number` (byte counts stay well within JS's safe-integer range).
    #[specta(type = u32)]
    pub size: u64,
    /// Id of the asset this operation belongs to.
    pub source_asset: String,
}

/// Where the pre-export backup archive will be written, and how big the content
/// being backed up is. The archive itself is created by execute (T13), not here.
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct BackupPlan {
    /// The target directory whose existing content is backed up before writes.
    pub target_path: String,
    /// Destination archive: ~/.agentmix/backups/<project-hash>/<timestamp>.zip.
    pub backup_archive: String,
    #[specta(type = u32)]
    pub size_bytes: u64,
}

/// One entry in the target-side ledger of AgentMix-managed assets.
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct ManagedAsset {
    pub name: String,
    /// Where this asset came from (source project id + relative path).
    pub source_ref: String,
    /// Content hash of the asset's SKILL.md, for later reconciliation.
    pub content_hash: String,
}

/// The target-side ledger written alongside the exported assets.
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct ManagedManifest {
    /// e.g. <target>/.claude/skills/.agentmix-manifest.json.
    pub manifest_path: String,
    pub managed_assets: Vec<ManagedAsset>,
}

/// One selected asset to export: the source directory to copy and the name it
/// will be written as. Asset-kind-agnostic — the planner copies directories and
/// never inspects a concrete asset type.
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct ExportRequestItem {
    pub asset_id: String,
    /// Absolute path of the asset's source directory (a Skill's skillDirPath).
    pub source_dir: String,
    pub exported_name: String,
    /// Source reference recorded in the manifest (e.g. sourceProjectId:relPath).
    pub source_ref: String,
}

/// The single object the Dry-run preview renders and execute consumes
/// (DESIGN.md §8.2). v0.1 targets one directory (Claude Code project-level), so
/// the multi-target / runtime-warning fields are omitted until v0.2.
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct ExportPlan {
    /// Resolved target directory: <project>/.claude/skills.
    pub target_dir: String,
    pub operations: Vec<FileOperation>,
    /// Must be empty before execute is allowed (DESIGN.md §8.2).
    pub conflicts: Vec<ExportConflict>,
    pub backups: Vec<BackupPlan>,
    pub managed_manifest: ManagedManifest,
    /// Sum of all operation sizes — the total bytes the export will write.
    #[specta(type = u32)]
    pub total_bytes: u64,
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
