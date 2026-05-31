import { create } from 'zustand';
import type { AppView, Skill, SourceProject } from '@/types';

// View / selection / settings state. Pure UI concerns, no domain logic.
interface UiState {
  view: AppView;
  selectedSkill: Skill | null;
  selectedProject: SourceProject | null;
  simpleMode: boolean;
  settingsOpen: boolean;
  leftCollapsed: boolean;
  // Merge workbench inputs (feature deferred to v0.1.5; kept as transient view state).
  mergeSkillA: Skill | null;
  mergeSkillB: Skill | null;
  setView: (view: AppView) => void;
  selectSkill: (skill: Skill, project: SourceProject) => void;
  toggleSimpleMode: () => void;
  setSettingsOpen: (open: boolean) => void;
  toggleLeftCollapsed: () => void;
  setMergeSkills: (a: Skill | null, b: Skill | null) => void;
}

export const useUiStore = create<UiState>((set) => ({
  view: 'main',
  selectedSkill: null,
  selectedProject: null,
  simpleMode: false,
  settingsOpen: false,
  leftCollapsed: false,
  mergeSkillA: null,
  mergeSkillB: null,
  setView: (view) => set({ view }),
  selectSkill: (skill, project) => set({ selectedSkill: skill, selectedProject: project }),
  toggleSimpleMode: () => set((s) => ({ simpleMode: !s.simpleMode })),
  setSettingsOpen: (settingsOpen) => set({ settingsOpen }),
  toggleLeftCollapsed: () => set((s) => ({ leftCollapsed: !s.leftCollapsed })),
  setMergeSkills: (mergeSkillA, mergeSkillB) => set({ mergeSkillA, mergeSkillB }),
}));
