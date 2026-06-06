import { create } from 'zustand';
import type {
  ExecutionReport,
  ExportPlan,
  ExportRequestItem,
  ExportScope,
  ExportTarget,
  ToolId,
} from '@/types';
import { buildExportPlan, executeExport } from '@/lib/exporter';
import { normalizePath } from '@/lib/path';

// The v0.2.0 default selection preserves v0.1 behavior: Claude Code, project
// scope. The target selector lets the user add tools and switch each to global.
const DEFAULT_TARGETS: ExportTarget[] = [{ tool: 'claude-code', scope: 'project', customPath: null }];

// Reset shared by every change that makes a built preview stale (target set,
// scope, or project path changed): drop the plan, confirmations and report.
const INVALIDATED_PREVIEW = {
  plan: null,
  overwriteConfirmed: false,
  acknowledgedRiskIds: [] as string[],
  buildError: null,
  report: null,
  executeError: null,
} as const;

// Recently used target paths (T26): a quick-pick list in the export panel,
// persisted across launches, deduped by the normalized-path rule (Windows:
// case-insensitive, both separators).
export const RECENT_TARGET_PATHS_MAX = 5;
const RECENT_TARGETS_KEY = 'agentmix.recentTargetPaths';

function readRecentTargets(): string[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(RECENT_TARGETS_KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter((p): p is string => typeof p === 'string') : [];
  } catch {
    return [];
  }
}

function writeRecentTargets(paths: string[]): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(RECENT_TARGETS_KEY, JSON.stringify(paths));
  }
}

// The export target, the built Dry-run plan, and the execution report. v0.1
// ships a single target (Claude Code project-level), so the target is a chosen
// project path rather than a multi-tool toggle list. The plan is the single
// object the preview renders and execute consumes; building it writes nothing,
// execute writes the files and returns the report.
interface ExportState {
  // The project path project-scope targets export into (global-scope targets
  // resolve under home and ignore it). Chosen via the recents quick-pick (T26).
  targetPath: string | null;
  // Most-recent-first quick-pick targets (persisted, T26).
  recentTargetPaths: string[];
  // The tools/scopes this export writes to (multi-target, T33). At most one entry
  // per tool; each carries its own project/global scope.
  selectedTargets: ExportTarget[];
  plan: ExportPlan | null;
  building: boolean;
  buildError: string | null;
  overwriteConfirmed: boolean;
  // Asset ids whose security risk the user explicitly accepted (per-skill, no
  // bulk bypass — DESIGN.md §1.11). Passed to execute, which refuses any
  // high-risk asset not listed here.
  acknowledgedRiskIds: string[];
  executing: boolean;
  executeError: string | null;
  report: ExecutionReport | null;
  setTargetPath: (path: string | null) => void;
  // Add the tool (default project scope) or remove it if already selected.
  toggleTarget: (tool: ToolId) => void;
  // Switch a selected tool between project and global scope.
  setTargetScope: (tool: ToolId, scope: ExportScope) => void;
  buildPlan: (items: ExportRequestItem[]) => Promise<void>;
  setOverwriteConfirmed: (confirmed: boolean) => void;
  acknowledgeRisk: (assetId: string, accepted: boolean) => void;
  execute: (items: ExportRequestItem[]) => Promise<void>;
  // Drop a stale preview / report (after the selection or target changes).
  resetPlan: () => void;
}

export const useExportStore = create<ExportState>((set, get) => ({
  targetPath: null,
  recentTargetPaths: readRecentTargets(),
  selectedTargets: DEFAULT_TARGETS,
  plan: null,
  building: false,
  buildError: null,
  overwriteConfirmed: false,
  acknowledgedRiskIds: [],
  executing: false,
  executeError: null,
  report: null,

  // Changing the target invalidates any existing preview / report. A chosen
  // path also moves to the front of the persisted recents (T26).
  setTargetPath: (targetPath) =>
    set((state) => {
      let recentTargetPaths = state.recentTargetPaths;
      if (targetPath) {
        recentTargetPaths = [
          targetPath,
          ...state.recentTargetPaths.filter(
            (p) => normalizePath(p) !== normalizePath(targetPath),
          ),
        ].slice(0, RECENT_TARGET_PATHS_MAX);
        writeRecentTargets(recentTargetPaths);
      }
      return {
        targetPath,
        recentTargetPaths,
        plan: null,
        overwriteConfirmed: false,
        acknowledgedRiskIds: [],
        buildError: null,
        report: null,
        executeError: null,
      };
    }),

  // Toggling the target set or a scope invalidates a built preview, the same way
  // changing the project path does.
  toggleTarget: (tool) =>
    set((state) => {
      const exists = state.selectedTargets.some((t) => t.tool === tool);
      const selectedTargets = exists
        ? state.selectedTargets.filter((t) => t.tool !== tool)
        : [...state.selectedTargets, { tool, scope: 'project' as ExportScope, customPath: null }];
      return { selectedTargets, ...INVALIDATED_PREVIEW };
    }),

  setTargetScope: (tool, scope) =>
    set((state) => ({
      selectedTargets: state.selectedTargets.map((t) => (t.tool === tool ? { ...t, scope } : t)),
      ...INVALIDATED_PREVIEW,
    })),

  buildPlan: async (items) => {
    const { targetPath, selectedTargets } = get();
    if (selectedTargets.length === 0) return;
    // A project-scope target needs the project path; a global-only export does
    // not. Without the path a project target can't resolve, so don't build.
    const needsProjectPath = selectedTargets.some((t) => t.scope === 'project');
    if (needsProjectPath && !targetPath) return;
    set({
      building: true,
      buildError: null,
      overwriteConfirmed: false,
      acknowledgedRiskIds: [],
      report: null,
    });
    try {
      const plan = await buildExportPlan(items, selectedTargets, targetPath ?? '');
      set({ plan, building: false });
    } catch (err) {
      set({ building: false, buildError: err instanceof Error ? err.message : String(err) });
    }
  },

  setOverwriteConfirmed: (overwriteConfirmed) => set({ overwriteConfirmed }),

  // Toggle a single asset's risk acknowledgment; ids stay unique.
  acknowledgeRisk: (assetId, accepted) =>
    set((state) => {
      const others = state.acknowledgedRiskIds.filter((id) => id !== assetId);
      return { acknowledgedRiskIds: accepted ? [...others, assetId] : others };
    }),

  execute: async (items) => {
    const { plan, acknowledgedRiskIds, overwriteConfirmed } = get();
    if (!plan) return;
    set({ executing: true, executeError: null });
    try {
      const report = await executeExport(plan, items, acknowledgedRiskIds, overwriteConfirmed);
      // The plan is now spent; show the report instead.
      set({
        executing: false,
        report,
        plan: null,
        overwriteConfirmed: false,
        acknowledgedRiskIds: [],
      });
    } catch (err) {
      set({ executing: false, executeError: err instanceof Error ? err.message : String(err) });
    }
  },

  resetPlan: () =>
    set({
      plan: null,
      overwriteConfirmed: false,
      acknowledgedRiskIds: [],
      report: null,
      executeError: null,
    }),
}));
