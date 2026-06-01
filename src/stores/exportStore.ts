import { create } from 'zustand';
import type { ExecutionReport, ExportPlan, ExportRequestItem } from '@/types';
import { buildExportPlan, executeExport } from '@/lib/exporter';

// The export target, the built Dry-run plan, and the execution report. v0.1
// ships a single target (Claude Code project-level), so the target is a chosen
// project path rather than a multi-tool toggle list. The plan is the single
// object the preview renders and execute consumes; building it writes nothing,
// execute writes the files and returns the report.
interface ExportState {
  targetPath: string | null;
  plan: ExportPlan | null;
  building: boolean;
  buildError: string | null;
  overwriteConfirmed: boolean;
  executing: boolean;
  executeError: string | null;
  report: ExecutionReport | null;
  setTargetPath: (path: string | null) => void;
  buildPlan: (items: ExportRequestItem[]) => Promise<void>;
  setOverwriteConfirmed: (confirmed: boolean) => void;
  execute: (items: ExportRequestItem[]) => Promise<void>;
  // Drop a stale preview / report (after the selection or target changes).
  resetPlan: () => void;
}

export const useExportStore = create<ExportState>((set, get) => ({
  targetPath: null,
  plan: null,
  building: false,
  buildError: null,
  overwriteConfirmed: false,
  executing: false,
  executeError: null,
  report: null,

  // Changing the target invalidates any existing preview / report.
  setTargetPath: (targetPath) =>
    set({
      targetPath,
      plan: null,
      overwriteConfirmed: false,
      buildError: null,
      report: null,
      executeError: null,
    }),

  buildPlan: async (items) => {
    const { targetPath } = get();
    if (!targetPath) return;
    set({ building: true, buildError: null, overwriteConfirmed: false, report: null });
    try {
      const plan = await buildExportPlan(items, targetPath);
      set({ plan, building: false });
    } catch (err) {
      set({ building: false, buildError: err instanceof Error ? err.message : String(err) });
    }
  },

  setOverwriteConfirmed: (overwriteConfirmed) => set({ overwriteConfirmed }),

  execute: async (items) => {
    const { plan } = get();
    if (!plan) return;
    set({ executing: true, executeError: null });
    try {
      const report = await executeExport(plan, items);
      // The plan is now spent; show the report instead.
      set({ executing: false, report, plan: null, overwriteConfirmed: false });
    } catch (err) {
      set({ executing: false, executeError: err instanceof Error ? err.message : String(err) });
    }
  },

  resetPlan: () =>
    set({ plan: null, overwriteConfirmed: false, report: null, executeError: null }),
}));
