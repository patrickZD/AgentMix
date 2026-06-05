import { create } from 'zustand';
import type { ExecutionReport, ExportPlan, ExportRequestItem } from '@/types';
import { buildExportPlan, executeExport } from '@/lib/exporter';
import { normalizePath } from '@/lib/path';

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
  targetPath: string | null;
  // Most-recent-first quick-pick targets (persisted, T26).
  recentTargetPaths: string[];
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

  buildPlan: async (items) => {
    const { targetPath } = get();
    if (!targetPath) return;
    set({
      building: true,
      buildError: null,
      overwriteConfirmed: false,
      acknowledgedRiskIds: [],
      report: null,
    });
    try {
      const plan = await buildExportPlan(items, targetPath);
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
