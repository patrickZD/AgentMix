import { create } from 'zustand';
import type { SourceProject, HealthCheckResult } from '@/types';
import { scanProject } from '@/lib/scan';
import { normalizePath } from '@/lib/path';

// Source projects + their scan/health results.
interface ProjectState {
  projects: SourceProject[];
  healthResults: HealthCheckResult[];
  scanning: boolean;
  scanError: string | null;
  addProject: (project: SourceProject) => void;
  removeProject: (projectId: string) => void;
  // Scan a folder and add (or replace, if the same path was scanned before) the
  // resulting project. Failures are surfaced in scanError, never swallowed.
  scanAndAdd: (path: string) => Promise<void>;
  clearScanError: () => void;
}

export const useProjectStore = create<ProjectState>((set) => ({
  // Projects come from the real `scan_project` command; health results are
  // populated by the deterministic health checks (T9). Both start empty so the
  // app opens on the welcome screen until a folder is scanned.
  projects: [],
  healthResults: [],
  scanning: false,
  scanError: null,

  addProject: (project) => set((s) => ({ projects: [...s.projects, project] })),

  removeProject: (projectId) =>
    set((s) => ({ projects: s.projects.filter((p) => p.id !== projectId) })),

  scanAndAdd: async (path) => {
    set({ scanning: true, scanError: null });
    try {
      const project = await scanProject(path);
      set((s) => {
        const key = normalizePath(project.rootPath);
        const others = s.projects.filter((p) => normalizePath(p.rootPath) !== key);
        return { projects: [...others, project], scanning: false };
      });
    } catch (err) {
      set({
        scanning: false,
        scanError: err instanceof Error ? err.message : String(err),
      });
    }
  },

  clearScanError: () => set({ scanError: null }),
}));
