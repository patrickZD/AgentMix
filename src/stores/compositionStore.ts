import { create } from 'zustand';
import type { ComboItem, ExportConflict, Skill, SourceProject } from '@/types';
import { detectConflicts } from '@/lib/composer';

let comboIdCounter = 0;

// The user's current combination: which skills are selected, their export
// names, and the detected conflicts. Selection mutations are synchronous and
// local; conflict detection is delegated to the Rust composer via
// refreshConflicts (single source of truth — the UI never re-implements the
// rule). The UI calls refreshConflicts whenever comboItems changes.
interface CompositionState {
  comboItems: ComboItem[];
  conflicts: ExportConflict[];
  addToCombo: (skill: Skill, project: SourceProject) => void;
  removeItem: (itemId: string) => void;
  moveItem: (itemId: string, direction: 'up' | 'down') => void;
  removeItemsByProject: (projectId: string) => void;
  // Conflict resolution: rename one item's exported name.
  renameItem: (itemId: string, exportedName: string) => void;
  // Conflict resolution: keep this item, drop the others sharing its exported
  // name (compared case-insensitively, matching the Rust rule).
  keepOne: (itemId: string) => void;
  // Re-detect conflicts from the current selection via the Rust composer.
  refreshConflicts: () => Promise<void>;
}

export const useCompositionStore = create<CompositionState>((set, get) => ({
  comboItems: [],
  conflicts: [],

  addToCombo: (skill, project) =>
    set((state) => {
      const alreadyIn = state.comboItems.some(
        (c) => c.skill.id === skill.id && c.project.id === project.id,
      );
      if (alreadyIn) return state;

      const newItem: ComboItem = {
        id: `combo-${++comboIdCounter}`,
        skill,
        project,
        exportedName: skill.name,
      };
      return { comboItems: [...state.comboItems, newItem] };
    }),

  removeItem: (itemId) =>
    set((state) => ({
      comboItems: state.comboItems.filter((c) => c.id !== itemId),
    })),

  moveItem: (itemId, direction) =>
    set((state) => {
      const idx = state.comboItems.findIndex((c) => c.id === itemId);
      if (idx < 0) return state;
      const newIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (newIdx < 0 || newIdx >= state.comboItems.length) return state;
      const arr = [...state.comboItems];
      [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
      return { comboItems: arr };
    }),

  removeItemsByProject: (projectId) =>
    set((state) => ({
      comboItems: state.comboItems.filter((c) => c.project.id !== projectId),
    })),

  renameItem: (itemId, exportedName) =>
    set((state) => ({
      comboItems: state.comboItems.map((c) =>
        c.id === itemId ? { ...c, exportedName } : c,
      ),
    })),

  keepOne: (itemId) =>
    set((state) => {
      const kept = state.comboItems.find((c) => c.id === itemId);
      if (!kept) return state;
      const keptName = kept.exportedName.toLowerCase();
      return {
        comboItems: state.comboItems.filter(
          (c) => c.id === itemId || c.exportedName.toLowerCase() !== keptName,
        ),
      };
    }),

  refreshConflicts: async () => {
    const candidates = get().comboItems.map((c) => ({
      id: c.id,
      exportedName: c.exportedName,
    }));
    const conflicts = await detectConflicts(candidates);
    set({ conflicts });
  },
}));
