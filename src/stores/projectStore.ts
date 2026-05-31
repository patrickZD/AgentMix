import { create } from 'zustand';
import type { SourceProject, HealthCheckResult } from '@/types';
import { MOCK_PROJECTS, MOCK_HEALTH_RESULTS } from '@/data/mockData';

// Source projects + their scan/health results.
interface ProjectState {
  projects: SourceProject[];
  healthResults: HealthCheckResult[];
  addProject: (project: SourceProject) => void;
  removeProject: (projectId: string) => void;
}

export const useProjectStore = create<ProjectState>((set) => ({
  // Interim: seeded from mock data. T7/T8 replace this with real scan results
  // (scan_project command), and T9 replaces healthResults with computed health.
  projects: MOCK_PROJECTS,
  healthResults: MOCK_HEALTH_RESULTS,
  addProject: (project) => set((s) => ({ projects: [...s.projects, project] })),
  removeProject: (projectId) =>
    set((s) => ({ projects: s.projects.filter((p) => p.id !== projectId) })),
}));
