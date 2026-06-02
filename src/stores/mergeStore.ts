import { create } from 'zustand';
import { validateMergeDraft } from '@/lib/merge';
import type { MergeDraftValidation } from '@/types';

// Merge-workbench session state (DESIGN.md §6.3, T24): the source combo items
// being merged, the draft text, the single-choice scripts source, and the live
// validation result from the Rust command. The confirm gate is
// `validation?.canConfirm === true` — a missing validation keeps it shut.

// Seed draft: the frontmatter skeleton the user completes (the draft's `name`
// becomes the merged asset's exported name).
export const DRAFT_TEMPLATE = '---\nname: \ndescription: \n---\n';

interface MergeState {
  open: boolean;
  /** Combo item ids feeding the source columns (>= 2). */
  sourceItemIds: string[];
  draft: string;
  /** Combo item id whose scripts/ is kept; null = keep none (single choice). */
  scriptsFromItemId: string | null;
  validation: MergeDraftValidation | null;
  validating: boolean;
  openWorkbench: (sourceItemIds: string[]) => void;
  closeWorkbench: () => void;
  setDraft: (draft: string) => void;
  /** The "→" splice action: append a source paragraph to the draft. */
  appendToDraft: (text: string) => void;
  setScriptsFrom: (itemId: string | null) => void;
  /** Re-validate against the composition's other exported names. */
  validate: (existingNames: string[]) => Promise<void>;
}

export const useMergeStore = create<MergeState>((set, get) => ({
  open: false,
  sourceItemIds: [],
  draft: '',
  scriptsFromItemId: null,
  validation: null,
  validating: false,

  openWorkbench: (sourceItemIds) =>
    set({
      open: true,
      sourceItemIds,
      draft: DRAFT_TEMPLATE,
      scriptsFromItemId: null,
      validation: null,
      validating: false,
    }),

  closeWorkbench: () =>
    set({
      open: false,
      sourceItemIds: [],
      draft: '',
      scriptsFromItemId: null,
      validation: null,
      validating: false,
    }),

  setDraft: (draft) => set({ draft }),

  appendToDraft: (text) =>
    set((state) => ({
      draft:
        state.draft.trim() === ''
          ? `${text}\n`
          : `${state.draft.trimEnd()}\n\n${text}\n`,
    })),

  setScriptsFrom: (scriptsFromItemId) => set({ scriptsFromItemId }),

  validate: async (existingNames) => {
    const { draft, scriptsFromItemId } = get();
    set({ validating: true });
    try {
      const validation = await validateMergeDraft(
        draft,
        existingNames,
        scriptsFromItemId !== null,
      );
      set({ validation, validating: false });
    } catch {
      // Safe-closed: without a validation result the confirm gate stays shut.
      set({ validation: null, validating: false });
    }
  },
}));
