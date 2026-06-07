import { create } from 'zustand';
import type { AppView, Skill, SourceProject } from '@/types';
import { APP_VERSION, readAppVersion } from '@/lib/appVersion';

// View / selection / settings state. Pure UI concerns, no domain logic.
interface UiState {
  view: AppView;
  selectedSkill: Skill | null;
  selectedProject: SourceProject | null;
  // Whether invalid scan candidates are shown in the source panel. Off by
  // default; also bound to the settings switch in T15.
  showInvalid: boolean;
  settingsOpen: boolean;
  leftCollapsed: boolean;
  // Displayed app version (footer / welcome). Seeded synchronously from the
  // build-time fallback, then refined to the running version by loadAppVersion.
  appVersion: string;
  setView: (view: AppView) => void;
  selectSkill: (skill: Skill, project: SourceProject) => void;
  toggleShowInvalid: () => void;
  setSettingsOpen: (open: boolean) => void;
  toggleLeftCollapsed: () => void;
  loadAppVersion: () => Promise<void>;
}

export const useUiStore = create<UiState>((set) => ({
  view: 'main',
  selectedSkill: null,
  selectedProject: null,
  showInvalid: false,
  settingsOpen: false,
  leftCollapsed: false,
  appVersion: APP_VERSION,
  setView: (view) => set({ view }),
  selectSkill: (skill, project) => set({ selectedSkill: skill, selectedProject: project }),
  toggleShowInvalid: () => set((s) => ({ showInvalid: !s.showInvalid })),
  setSettingsOpen: (settingsOpen) => set({ settingsOpen }),
  toggleLeftCollapsed: () => set((s) => ({ leftCollapsed: !s.leftCollapsed })),
  loadAppVersion: async () => set({ appVersion: await readAppVersion() }),
}));
