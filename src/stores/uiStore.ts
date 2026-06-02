import { create } from 'zustand';
import type { AppView, Skill, SourceProject } from '@/types';

// View / selection / settings state. Pure UI concerns, no domain logic.
interface UiState {
  view: AppView;
  selectedSkill: Skill | null;
  selectedProject: SourceProject | null;
  simpleMode: boolean;
  // Whether invalid scan candidates are shown in the source panel. Off by
  // default; also bound to the settings switch in T15.
  showInvalid: boolean;
  settingsOpen: boolean;
  leftCollapsed: boolean;
  setView: (view: AppView) => void;
  selectSkill: (skill: Skill, project: SourceProject) => void;
  toggleSimpleMode: () => void;
  toggleShowInvalid: () => void;
  setSettingsOpen: (open: boolean) => void;
  toggleLeftCollapsed: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  view: 'main',
  selectedSkill: null,
  selectedProject: null,
  simpleMode: false,
  showInvalid: false,
  settingsOpen: false,
  leftCollapsed: false,
  setView: (view) => set({ view }),
  selectSkill: (skill, project) => set({ selectedSkill: skill, selectedProject: project }),
  toggleSimpleMode: () => set((s) => ({ simpleMode: !s.simpleMode })),
  toggleShowInvalid: () => set((s) => ({ showInvalid: !s.showInvalid })),
  setSettingsOpen: (settingsOpen) => set({ settingsOpen }),
  toggleLeftCollapsed: () => set((s) => ({ leftCollapsed: !s.leftCollapsed })),
}));
