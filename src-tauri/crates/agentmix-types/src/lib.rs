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

/// Three-way scan classification (DESIGN.md §1.1).
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

/// Why an export conflict was raised (DESIGN.md §1.2). Both block export.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub enum ConflictKind {
    /// Two or more selected assets share the same exported name.
    NameCollision,
    /// A selected asset's exported name already exists in the target directory.
    TargetExists,
    /// A selected asset's exported name is unsafe as a directory segment (empty,
    /// `.`/`..`, or contains a path separator / drive prefix). It must be renamed
    /// before export so every write stays inside `.claude/skills/` (§1.11).
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

/// One planned file write (DESIGN.md §3.2 FileOperation). Carries the byte
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
    /// Index into `ExportPlan.targets` of the target this write belongs to, so
    /// the preview can group operations per tool / scope (multi-target, T32).
    pub target_index: u32,
}

/// Where the pre-export backup archive will be written, and how big the content
/// being backed up is. The archive itself is created by execute (T13), not here.
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct BackupPlan {
    /// The target directory whose existing content is backed up before writes.
    pub target_path: String,
    /// Destination archive: ~/.agentmix/backups/<root-hash>/<timestamp>.zip.
    pub backup_archive: String,
    #[specta(type = u32)]
    pub size_bytes: u64,
    /// Index into `ExportPlan.targets` of the target whose root is backed up.
    pub target_index: u32,
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
/// merge, DESIGN.md §1.3): the primary file is written from the draft string,
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

/// An AI coding tool an export can target. The five built-ins ship with baseline
/// `ToolAdapter` data (DESIGN.md §1.4); `Custom` is a user-defined target whose
/// destination root comes from `ExportTarget.custom_path`, not from a baseline.
/// Serialized as the tool id used across the matrix (`opencode` is one word).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Type)]
#[serde(rename_all = "kebab-case")]
pub enum ToolId {
    ClaudeCode,
    Cursor,
    Codex,
    #[serde(rename = "opencode")]
    OpenCode,
    GeminiCli,
    Custom,
}

/// How a tool resolves the same skill name found at more than one scope
/// (DESIGN.md §1.4). Feeds RuntimeConflict messaging (T35); path resolution
/// does not read it.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Type)]
#[serde(rename_all = "kebab-case")]
pub enum Precedence {
    ProjectFirst,
    UserFirst,
    MergeAll,
}

/// What a tool does when two skills share a name in the same location
/// (DESIGN.md §1.4). Feeds RuntimeConflict messaging (T35).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Type)]
#[serde(rename_all = "kebab-case")]
pub enum DuplicateNameBehavior {
    LastWins,
    ShowBoth,
    Error,
}

/// Whether a tool picks up newly written skills without being restarted
/// (DESIGN.md §1.4). Informational; carried for the export summary.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Type)]
#[serde(rename_all = "kebab-case")]
pub enum ReloadBehavior {
    Auto,
    RestartRequired,
}

/// The full runtime profile of one export target tool (DESIGN.md §1.4). Built-in
/// instances are the embedded baseline; the pipeline reads behavior from this
/// data and never hard-branches on a tool id (architecture red line). Paths are
/// stored relative to their scope root: `project_paths` under the target
/// project, `user_paths` under the home directory; `admin_paths` are absolute
/// system dirs.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct ToolAdapter {
    pub id: ToolId,
    pub display_name: String,
    /// Project-level skills dirs, relative to the target project root. A tool may
    /// read several (OpenCode, Gemini); the exporter writes only the first (the
    /// tool's native primary path) — see the multi-path decision (T34).
    pub project_paths: Vec<String>,
    /// User-level skills dirs, relative to the home directory (the table's
    /// `~/.<tool>/skills/` without the leading `~/`). Empty when a tool has no
    /// user scope (Cursor).
    pub user_paths: Vec<String>,
    /// System-level skills dirs (absolute). Only Codex ships one; v0.2.0 carries
    /// this as data but does not resolve admin scope as a selectable target.
    #[serde(default)]
    pub admin_paths: Vec<String>,
    pub precedence: Precedence,
    pub duplicate_name_behavior: DuplicateNameBehavior,
    pub reload_behavior: ReloadBehavior,
}

/// Where exported assets land: per-project, or the user's global tool config
/// (DESIGN.md §3.2). v0.2.0 resolves `Project` (→ adapter.projectPaths under the
/// target project) and `Global` (→ adapter.userPaths under home).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Type)]
#[serde(rename_all = "kebab-case")]
pub enum ExportScope {
    Project,
    Global,
}

/// One export target the user selected (DESIGN.md §3.2): which tool, at which
/// scope, plus the destination root typed for a `Custom` tool.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct ExportTarget {
    pub tool: ToolId,
    pub scope: ExportScope,
    /// Set only when `tool == Custom`: the destination root the user supplied.
    /// Ignored for built-in tools (their roots resolve from the adapter).
    pub custom_path: Option<String>,
}

/// One resolved export target in a plan (DESIGN.md §3.2 `ExportPlan.targets`):
/// the tool's adapter, the chosen scope, the destination root(s) the writes
/// land in, and the AgentMix-managed ledger written at that root. v0.2.0 writes
/// one root per target (multi-path tools write only their primary path, T34),
/// so `destination_roots` usually holds one entry.
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct ExportPlanTarget {
    pub adapter: ToolAdapter,
    pub scope: ExportScope,
    /// Resolved absolute destination root(s), forward-slashed (DESIGN.md §4.8).
    pub destination_roots: Vec<String>,
    /// The managed-asset ledger written alongside this target's exported skills.
    pub managed_manifest: ManagedManifest,
}

/// How a target tool resolves the same skill name appearing at more than one
/// scope it reads, once this export lands (DESIGN.md §1.2 / §1.4). Computed from
/// the adapter's `precedence` + `duplicateNameBehavior`; the frontend maps it to
/// a warning message. Warning-level only — RuntimeConflict never blocks export.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub enum RuntimeConflictKind {
    /// Both copies load and stay visible (show-both / merge-all, e.g. Codex).
    BothActive,
    /// The copy being exported takes precedence; the existing one is shadowed.
    ExportedWins,
    /// The existing copy takes precedence; the one being exported is shadowed.
    ExistingWins,
}

/// A runtime resolution note (DESIGN.md §1.2): the skill being exported shares a
/// name with one the target tool already reads from another scope, so the tool
/// faces two same-named skills at runtime. Warning-level — it informs the user of
/// the tool's runtime behavior and never blocks export (the only blocker is
/// ExportConflict). Linked to its target via `target_index`.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct RuntimeConflict {
    pub exported_name: String,
    pub kind: RuntimeConflictKind,
    /// Index into `ExportPlan.targets` of the target this note belongs to.
    pub target_index: u32,
}

/// How a target tool treats a given SKILL.md frontmatter field (DESIGN.md
/// §1.10). `Supported` raises no warning; the other three do (the field is
/// dropped, rejected, or only experimentally handled by that tool).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub enum CapabilityStatus {
    Supported,
    Ignored,
    Error,
    Experimental,
}

/// A cross-tool compatibility note (DESIGN.md §1.10): a skill uses a frontmatter
/// `field` that the target tool does not fully support. Warning-level — like
/// RuntimeConflict it never blocks export. Linked to its target via
/// `target_index`; the status is anything but `Supported`.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct CapabilityWarning {
    pub exported_name: String,
    /// The SKILL.md frontmatter field, e.g. `allowed-tools`.
    pub field: String,
    pub status: CapabilityStatus,
    /// Index into `ExportPlan.targets` of the target this note belongs to.
    pub target_index: u32,
}

/// The single object the Dry-run preview renders and execute consumes
/// (DESIGN.md §3.2). v0.2.0 supports multiple targets: one composition exported
/// to several tools / scopes at once. Each `FileOperation` / `BackupPlan` links
/// back to its target via `target_index`.
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct ExportPlan {
    /// The tools / scopes this plan writes to, in selection order.
    pub targets: Vec<ExportPlanTarget>,
    pub operations: Vec<FileOperation>,
    /// Must be empty before execute is allowed (DESIGN.md §3.2).
    pub conflicts: Vec<ExportConflict>,
    /// Runtime resolution notes (DESIGN.md §1.2): warning-level, never block
    /// export. Empty when no exported skill collides with an existing same-named
    /// skill at another scope the target tool reads.
    pub runtime_warnings: Vec<RuntimeConflict>,
    /// Cross-tool compatibility notes (DESIGN.md §1.10): warning-level, never
    /// block export. One per (skill field, target) the target tool does not fully
    /// support.
    pub capability_warnings: Vec<CapabilityWarning>,
    pub backups: Vec<BackupPlan>,
    /// Per-asset security pre-check (DESIGN.md §1.11). A report with
    /// `requiresConfirmation` must be acknowledged before execute will write
    /// that asset; the preview renders these and the user accepts per-skill.
    /// One report per selected asset (the source is scanned once, not per target).
    pub security_reports: Vec<SkillSecurityReport>,
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
/// §1.11). Serialized as the canonical rule id shown in the UI, e.g.
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

/// One high-risk line found in a script (DESIGN.md §1.11). Carries the rule, the
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
/// (DESIGN.md §1.11). Shown but not judged — AgentMix cannot rule on a binary's
/// behavior without executing it, so binaries never gate export by themselves.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct BinaryAsset {
    /// Path relative to the skill directory, forward-slashed.
    pub file: String,
    #[specta(type = u32)]
    pub size_bytes: u64,
}

/// Deterministic security pre-check result for one skill (DESIGN.md §1.11).
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

/// Live validation result for a merge-workbench draft (DESIGN.md §1.3, T24).
/// Reuses the parser/health single source of truth — the frontend renders
/// these and never re-implements the rules. `can_confirm` is the confirm-gate:
/// false on any blocking problem (error-level issue, name collision with the
/// composition, or a name unusable as the exported directory segment).
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct MergeDraftValidation {
    pub health_status: HealthStatus,
    /// Findings with i18n-key messages, same shape the health report uses.
    pub issues: Vec<HealthIssue>,
    /// The draft's name clashes (case-insensitively) with a composition name.
    pub name_collision: bool,
    /// The draft's name cannot be a single safe directory segment (empty,
    /// over the 64-char cap, traversal, or path separators).
    pub name_unsafe: bool,
    /// Frontmatter `name` — the merged asset's exported name once confirmed.
    pub parsed_name: Option<String>,
    pub can_confirm: bool,
}

/// Result of an update check against GitHub Releases (DESIGN.md §1.16).
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
