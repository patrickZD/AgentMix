// ──────────────────────────────────────────────
//  AgentMix – app/UI view-model types
// ──────────────────────────────────────────────
//
// These are the interim UI view-models the Pixso draft components use. The
// canonical cross-end domain types live in ./generated.ts (generated from the
// Rust models via tauri-specta). As each component is reworked against real
// backend data (T7+), it migrates from these shapes to the generated domain
// types, and this file shrinks toward purely-UI types (e.g. AppView).

export type SkillChangeTag = 'NEW' | 'UPDATED' | 'REMOVED' | null;
export type SkillStatus = 'healthy' | 'warning' | 'error';
export type ExportTool = 'claude-code' | 'cursor' | 'codex-cli' | 'opencode';
export type AppView = 'welcome' | 'main' | 'merge-workbench' | 'health-check';

export interface SkillFrontmatter {
  name: string;
  version?: string;
  description?: string;
  author?: string;
  tags?: string[];
  [key: string]: unknown;
}

export interface Skill {
  id: string;
  name: string;
  displayName: string;
  status: SkillStatus;
  changeTag: SkillChangeTag;
  description: string;
  content: string;
  frontmatter: SkillFrontmatter;
  projectId: string;
  filePath?: string;
}

export interface SourceProject {
  id: string;
  name: string;
  path: string;
  skills: Skill[];
  lastScanned?: string;
  skillsDir?: string;
}

export interface ComboItem {
  id: string;
  skill: Skill;
  project: SourceProject;
  hasConflict: boolean;
  conflictWith?: string; // ComboItem id
  includeInExport: boolean;
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

export interface MergeWorkbenchState {
  skillA: Skill | null;
  skillB: Skill | null;
  draftBlocks: MergeBlock[];
  aiPrompt: string;
}

export interface HealthCheckResult {
  skill: Skill;
  project: SourceProject;
  checks: HealthCheck[];
}

export interface HealthCheck {
  id: string;
  label: string;
  passed: boolean;
  message?: string;
}

export interface AppSettings {
  simpleMode: boolean;
  autoDetectTools: boolean;
  defaultExportPath: string;
}
