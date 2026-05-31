import { create } from 'zustand';
import type { ExportPlan, ExportRequestItem } from '@/types';
import { buildExportPlan } from '@/lib/exporter';

// The export target + the built Dry-run plan. v0.1 ships a single target
// (Claude Code project-level), so the target is a chosen project path rather
// than a multi-tool toggle list. The plan is the single object the preview
// renders and execute (T13) will consume; building it writes nothing.
interface ExportState {
  targetPath: string | null;
  plan: ExportPlan | null;
  building: boolean;
  buildError: string | null;
  overwriteConfirmed: boolean;
  setTargetPath: (path: string | null) => void;
  buildPlan: (items: ExportRequestItem[]) => Promise<void>;
  setOverwriteConfirmed: (confirmed: boolean) => void;
  // Drop a stale preview (after the selection or target changes).
  resetPlan: () => void;
}

export const useExportStore = create<ExportState>((set, get) => ({
  targetPath: null,
  plan: null,
  building: false,
  buildError: null,
  overwriteConfirmed: false,

  // Changing the target invalidates any existing preview.
  setTargetPath: (targetPath) =>
    set({ targetPath, plan: null, overwriteConfirmed: false, buildError: null }),

  buildPlan: async (items) => {
    const { targetPath } = get();
    if (!targetPath) return;
    set({ building: true, buildError: null, overwriteConfirmed: false });
    try {
      const plan = await buildExportPlan(items, targetPath);
      set({ plan, building: false });
    } catch (err) {
      set({ building: false, buildError: err instanceof Error ? err.message : String(err) });
    }
  },

  setOverwriteConfirmed: (overwriteConfirmed) => set({ overwriteConfirmed }),

  resetPlan: () => set({ plan: null, overwriteConfirmed: false }),
}));
