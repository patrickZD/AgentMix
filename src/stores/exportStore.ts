import { create } from 'zustand';
import type { ExportTarget } from '@/types';
import { MOCK_EXPORT_TARGETS } from '@/data/mockData';

// Export targets and (later) the ExportPlan / execution report.
interface ExportState {
  exportTargets: ExportTarget[];
  toggleTarget: (id: string, enabled: boolean) => void;
}

export const useExportStore = create<ExportState>((set) => ({
  // Interim: seeded from mock data. v0.1 only ships Claude Code project-level;
  // the real ExportPlan build/preview/execute flow lands in T11–T13.
  exportTargets: MOCK_EXPORT_TARGETS,
  toggleTarget: (id, enabled) =>
    set((s) => ({
      exportTargets: s.exportTargets.map((t) => (t.id === id ? { ...t, enabled } : t)),
    })),
}));
