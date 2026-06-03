// ──────────────────────────────────────────────
//  AgentMix – app/UI view-model types
// ──────────────────────────────────────────────
//
// The canonical cross-end domain types (Skill, SourceProject, AssetCategory,
// HealthStatus, ...) are generated from the Rust models in ./generated.ts and
// are the single source of truth. They are re-exported here so components keep
// importing everything from '@/types'. The types defined below are purely-UI
// composites that the backend does not model (combo bookkeeping, export-target
// view rows, the health-report view shape).

export type {
  Skill,
  SourceProject,
  AssetKind,
  AssetCategory,
  HealthStatus,
  HealthLevel,
  HealthIssue,
  ConflictCandidate,
  ConflictKind,
  ExportConflict,
  ExportPlan,
  ExportRequestItem,
  ExportItemSource,
  ExecutionReport,
  FileOperation,
  FileOperationKind,
  FileSource,
  BackupPlan,
  ManagedManifest,
  ManagedAsset,
  SecurityRule,
  SecurityFinding,
  BinaryAsset,
  SkillSecurityReport,
  MergeDraftValidation,
  UpdateCheckResult,
  UpdateDownloadProgress,
} from './generated';

import type { Skill, SourceProject } from './generated';

export type AppView = 'welcome' | 'main' | 'health-check';

export interface ComboItem {
  id: string;
  skill: Skill;
  project: SourceProject;
  // The name this skill will be written as on export; defaults to skill.name,
  // changed by conflict resolution (rename). Conflicts are detected from these
  // by the Rust composer, not flagged per-item here.
  exportedName: string;
}

// A manually merged entry in the composition (T24, DESIGN.md §6.3). Exported
// content-backed: SKILL.md comes from `draft`, scripts optionally from one
// source directory. `replacedItems` are the combo items the merge consumed,
// kept so removing the merged entry restores them (T25).
export interface MergedComboItem {
  id: string;
  // Exported name == the draft's frontmatter `name` (workbench-validated).
  name: string;
  draft: string;
  scriptsFromDir: string | null;
  // Source skill names for display ("merged from a + b").
  sourceSkillNames: string[];
  replacedItems: ComboItem[];
}
