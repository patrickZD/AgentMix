import { create } from 'zustand';
import type { ComboItem, Skill, SourceProject } from '@/types';

let comboIdCounter = 0;

// The user's current combination: which skills are selected, ordering, and the
// interim same-name conflict flag. NOTE: this is UI-side combo bookkeeping; the
// authoritative ExportConflict detection (case-insensitive, against the export
// target) lands in Rust at T10. Conflict matching here preserves the Pixso
// draft's exact-name behavior until then.
interface CompositionState {
  comboItems: ComboItem[];
  addToCombo: (skill: Skill, project: SourceProject) => void;
  removeItem: (itemId: string) => void;
  moveItem: (itemId: string, direction: 'up' | 'down') => void;
  removeItemsByProject: (projectId: string) => void;
}

export const useCompositionStore = create<CompositionState>((set) => ({
  comboItems: [],

  addToCombo: (skill, project) =>
    set((state) => {
      const alreadyIn = state.comboItems.some(
        (c) => c.skill.id === skill.id && c.project.id === project.id,
      );
      if (alreadyIn) return state;

      // Same skill name from a different project => flag both as conflicting.
      const existing = state.comboItems.find(
        (c) => c.skill.name === skill.name && c.project.id !== project.id,
      );

      const newItem: ComboItem = {
        id: `combo-${++comboIdCounter}`,
        skill,
        project,
        hasConflict: !!existing,
        conflictWith: existing?.id,
        includeInExport: true,
      };

      const items = existing
        ? state.comboItems.map((c) =>
            c.id === existing.id ? { ...c, hasConflict: true, conflictWith: newItem.id } : c,
          )
        : state.comboItems;

      return { comboItems: [...items, newItem] };
    }),

  removeItem: (itemId) =>
    set((state) => ({
      comboItems: state.comboItems
        .filter((c) => c.id !== itemId)
        .map((c) =>
          c.conflictWith === itemId ? { ...c, hasConflict: false, conflictWith: undefined } : c,
        ),
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
    set((state) => ({ comboItems: state.comboItems.filter((c) => c.project.id !== projectId) })),
}));
