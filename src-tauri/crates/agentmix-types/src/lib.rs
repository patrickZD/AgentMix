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
    /// A selected asset's exported name is unsafe as a directory segment (empty,
    /// `.`/`..`, or contains a path separator / drive prefix). It must be renamed
    /// before export so every write stays inside `.claude/skills/` (§6.11).
    InvalidName,
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

/// Where a planned write's bytes come from (T23). `Path` copies a source
/// file; `Content` writes the provided string verbatim (a manually merged
/// asset's primary file is backed by its draft, not by a source file).
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Type)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum FileSource {
    #[serde(rename_all = "camelCase")]
    Path { path: String },
    #[serde(rename_all = "camelCase")]
    Content { content: String },
}

/// One planned file write (DESIGN.md §8.2 FileOperation). Carries the byte
/// source so execute writes exactly what the plan listed — preview and
/// execution can't diverge (DoD-3). `source` extends the design model, which
/// named only the asset; the source is needed for plan-driven execution.
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct FileOperation {
    pub kind: FileOperationKind,
    /// Absolute destination path.
    pub path: String,
    /// Where the written bytes come from (file copy or inline content).
    pub source: FileSource,
    /// Bytes that will be written. Equals the source size for verbatim files;
    /// for the skill's SKILL.md it is the size after the `name:` rewrite.
    /// Exported to TS as `number` (byte counts stay in JS's safe-integer range).
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

/// Where an export item's files come from (T23). `Directory` copies a scanned
/// asset's whole directory. `Content` is a content-backed asset (a manual
/// merge, DESIGN.md §6.3): the primary file is written from the draft string,
/// and `scripts_from_dir` optionally names ONE source asset directory whose
/// `scripts/` subtree is kept (the user's single-choice in the workbench).
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Type)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum ExportItemSource {
    #[serde(rename_all = "camelCase")]
    Directory { dir: String },
    #[serde(rename_all = "camelCase")]
    Content {
        content: String,
        scripts_from_dir: Option<String>,
    },
}

/// One selected asset to export: where its files come from and the name it
/// will be written as. Asset-kind-agnostic — the planner copies directories or
/// writes provided content and never inspects a concrete asset type.
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct ExportRequestItem {
    pub asset_id: String,
    /// The item's file source (a Skill's skillDirPath, or a merge draft).
    pub source: ExportItemSource,
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
    /// Per-asset security pre-check (DESIGN.md §6.11). A report with
    /// `requiresConfirmation` must be acknowledged before execute will write
    /// that asset; the preview renders these and the user accepts per-skill.
    pub security_reports: Vec<SkillSecurityReport>,
    pub managed_manifest: ManagedManifest,
    /// Sum of all operation sizes — the total bytes the export will write.
    #[specta(type = u32)]
    pub total_bytes: u64,
}

/// What execute actually did. Returned by ExportCoordinator.execute (T13) and
/// shown in the UI; backupArchive (if any) backs the "open backup folder" action.
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct ExecutionReport {
    pub target_dir: String,
    pub skills_exported: u32,
    pub files_created: u32,
    pub files_overwritten: u32,
    pub backup_archive: Option<String>,
}

/// Static-scan rule categories for suspicious script operations (DESIGN.md
/// §6.11). Serialized as the canonical rule id shown in the UI, e.g.
/// "network-download-execute". AgentMix surfaces these; it does not certify safety.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Type)]
#[serde(rename_all = "kebab-case")]
pub enum SecurityRule {
    /// Download-and-execute: `curl | sh`, `wget -O- | bash`, `iwr | iex`.
    NetworkDownloadExecute,
    /// Access to sensitive paths/credentials: ~/.ssh, ~/.aws, .env, /etc/, cred APIs.
    SensitivePathAccess,
    /// Dynamic execution of strings: eval / exec(...) / Invoke-Expression.
    DynamicEval,
    /// Reverse-shell or crypto-miner signatures.
    ReverseShellOrMiner,
}

/// One high-risk line found in a script (DESIGN.md §6.11). Carries the rule, the
/// script path relative to the skill directory, the 1-based line number, and the
/// line text so the UI can highlight exactly what matched.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct SecurityFinding {
    pub rule: SecurityRule,
    /// Script path relative to the skill directory, forward-slashed.
    pub file: String,
    /// 1-based line number of the matched line.
    pub line: u32,
    /// The matched line (trimmed) for display.
    pub snippet: String,
}

/// A non-text asset carried by a skill, listed so the user knows what is inside
/// (DESIGN.md §6.11). Shown but not judged — AgentMix cannot rule on a binary's
/// behavior without executing it, so binaries never gate export by themselves.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct BinaryAsset {
    /// Path relative to the skill directory, forward-slashed.
    pub file: String,
    #[specta(type = u32)]
    pub size_bytes: u64,
}

/// Deterministic security pre-check result for one skill (DESIGN.md §6.11).
/// AgentMix promises "risk visible", not "safe": findings / oversize / binaries
/// are surfaced. `requiresConfirmation` means the skill is denied import/export
/// until the user explicitly accepts its risk (no bulk bypass).
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct SkillSecurityReport {
    pub asset_id: String,
    /// Total size of the skill directory in bytes.
    #[specta(type = u32)]
    pub size_bytes: u64,
    /// True when the skill exceeds the 2MB per-skill cap (red flag).
    pub oversize: bool,
    pub binary_assets: Vec<BinaryAsset>,
    pub findings: Vec<SecurityFinding>,
    /// True when there is any high-risk finding or the skill is oversize; the
    /// user must confirm this skill before it may be imported/exported.
    pub requires_confirmation: bool,
}

/// Result of an update check against GitHub Releases (DESIGN.md §6.16).
/// `available == false` covers both "already up to date" and the silent
/// network-failure path (fail quiet, retry next launch).
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct UpdateCheckResult {
    pub available: bool,
    /// Latest release version, e.g. "0.1.5"; set only when `available`.
    pub version: Option<String>,
    /// Release notes (GitHub release body) for the update modal.
    pub notes: Option<String>,
}

/// Payload of the `update-download-progress` event emitted while
/// `install_update` downloads the new package.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct UpdateDownloadProgress {
    #[specta(type = u32)]
    pub downloaded_bytes: u64,
    /// Total size if the server reported a Content-Length.
    #[specta(type = Option<u32>)]
    pub total_bytes: Option<u64>,
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
