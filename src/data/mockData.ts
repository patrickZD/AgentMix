import type { ExportTarget } from '../types';

// Interim seed for the export-target panel. v0.1 only ships the Claude Code
// project-level target; the real detection + ExportPlan flow lands in T11–T13,
// which replaces this list. Source projects and health results are no longer
// mocked — they come from the real `scan_project` command (T7/T8) and the
// deterministic health checks (T9).
export const MOCK_EXPORT_TARGETS: ExportTarget[] = [
  {
    id: `et-1`,
    tool: `claude-code`,
    label: `Claude Code`,
    path: `~/projects/my-saas-app/.claude/CLAUDE.md`,
    enabled: true,
    level: `project`,
    detected: true,
  },
  {
    id: `et-2`,
    tool: `cursor`,
    label: `Cursor`,
    path: `~/projects/my-saas-app/.cursorrules`,
    enabled: true,
    level: `project`,
    detected: true,
  },
  {
    id: `et-3`,
    tool: `codex-cli`,
    label: `Codex CLI`,
    path: `~/.codex/instructions.md`,
    enabled: false,
    level: `global`,
    detected: false,
  },
  {
    id: `et-4`,
    tool: `opencode`,
    label: `OpenCode`,
    path: `~/projects/my-saas-app/.opencode/skills.md`,
    enabled: false,
    level: `project`,
    detected: false,
  },
];
