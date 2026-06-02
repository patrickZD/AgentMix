import { create } from 'zustand';
import type { ComboItem, ExportConflict, MergedComboItem, Skill, SourceProject } from '@/types';
import { detectConflicts } from '@/lib/composer';

let comboIdCounter = 0;
let mergedIdCounter = 0;

// The user's current combination: which skills are selected, their export
// names, and the detected conflicts. Selection mutations are synchronous and
// local; conflict detection is delegated to the Rust composer via
// refreshConflicts (single source of truth — the UI never re-implements the
// rule). The UI calls refreshConflicts whenever comboItems changes.
interface CompositionState {
  comboItems: ComboItem[];
  // Manually merged entries (T24); they join conflict detection and export
  // alongside the regular items.
  mergedItems: MergedComboItem[];
  conflicts: ExportConflict[];
  addToCombo: (skill: Skill, project: SourceProject) => void;
  // Confirm a merge: the consumed combo items leave the list (kept inside the
  // entry for restore) and the merged entry joins the composition.
  addMergedItem: (
    merged: Omit<MergedComboItem, 'id' | 'replacedItems'>,
    replacedItemIds: string[],
  ) => void;
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
  mergedItems: [],
  conflicts: [],

  addMergedItem: (merged, replacedItemIds) =>
    set((state) => {
      const replaced = new Set(replacedItemIds);
      const entry: MergedComboItem = {
        ...merged,
        id: `merged-${++mergedIdCounter}`,
        replacedItems: state.comboItems.filter((c) => replaced.has(c.id)),
      };
      return {
        comboItems: state.comboItems.filter((c) => !replaced.has(c.id)),
        mergedItems: [...state.mergedItems, entry],
      };
    }),

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
    const { comboItems, mergedItems } = get();
    // Merged entries compete for names like any other item (T24).
    const candidates = [
      ...comboItems.map((c) => ({ id: c.id, exportedName: c.exportedName })),
      ...mergedItems.map((m) => ({ id: m.id, exportedName: m.name })),
    ];
    const conflicts = await detectConflicts(candidates);
    set({ conflicts });
  },
}));
