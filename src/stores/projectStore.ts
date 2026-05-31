import { create } from 'zustand';
import type { SourceProject, HealthCheckResult } from '@/types';

// Source projects + their scan/health results.
interface ProjectState {
  projects: SourceProject[];
  healthResults: HealthCheckResult[];
  addProject: (project: SourceProject) => void;
  removeProject: (projectId: string) => void;
}

export const useProjectStore = create<ProjectState>((set) => ({
  // Projects come from the real `scan_project` command (wired in T8); health
  // results are populated by the deterministic health checks (T9). Both start
  // empty so the app opens on the welcome screen until a folder is scanned.
  projects: [],
  healthResults: [],
  addProject: (project) => set((s) => ({ projects: [...s.projects, project] })),
  removeProject: (projectId) =>
    set((s) => ({ projects: s.projects.filter((p) => p.id !== projectId) })),
}));
