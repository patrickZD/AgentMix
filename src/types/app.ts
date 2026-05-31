// ──────────────────────────────────────────────
//  AgentMix – app/UI view-model types
// ──────────────────────────────────────────────
//
// The canonical cross-end domain types (Skill, SourceProject, AssetCategory,
// HealthStatus, ...) are generated from the Rust models in ./generated.ts and
// are the single source of truth. They are re-exported here so components keep
// importing everything from '@/types'. The types defined below are purely-UI
// composites that the backend does not model (combo bookkeeping, export-target
// view rows, merge-draft blocks, the health-report view shape).

export type {
  Skill,
  SourceProject,
  AssetKind,
  AssetCategory,
  HealthStatus,
  HealthLevel,
  HealthIssue,
  ConflictCandidate,
  ExportConflict,
} from './generated';

import type { Skill, SourceProject } from './generated';

export type ExportTool = 'claude-code' | 'cursor' | 'codex-cli' | 'opencode';
export type AppView = 'welcome' | 'main' | 'merge-workbench' | 'health-check';

export interface ComboItem {
  id: string;
  skill: Skill;
  project: SourceProject;
  // The name this skill will be written as on export; defaults to skill.name,
  // changed by conflict resolution (rename). Conflicts are detected from these
  // by the Rust composer, not flagged per-item here.
  exportedName: string;
}

export interface ExportTarget {
  id: string;
  tool: ExportTool;
  label: string;
  path: string;
  enabled: boolean;
  level: 'project' | 'global';
  detected: boolean;
}

export interface MergeBlock {
  id: string;
  source: 'A' | 'B' | 'draft';
  text: string;
}
