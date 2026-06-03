import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useMergeStore, DRAFT_TEMPLATE } from './mergeStore';
import { validateMergeDraft } from '@/lib/merge';
import type { MergeDraftValidation } from '@/types';

vi.mock('@/lib/merge', () => ({ validateMergeDraft: vi.fn() }));
const mockValidate = vi.mocked(validateMergeDraft);

const okValidation: MergeDraftValidation = {
  healthStatus: 'ok',
  issues: [],
  nameCollision: false,
  nameUnsafe: false,
  parsedName: 'merged-x',
  canConfirm: true,
};

const store = () => useMergeStore.getState();

beforeEach(() => {
  mockValidate.mockReset();
  useMergeStore.setState({
    open: false,
    sourceItemIds: [],
    draft: '',
    scriptsFromItemId: null,
    validation: null,
    validating: false,
  });
});

describe('mergeStore.openWorkbench', () => {
  it('opens with the source items and a frontmatter template draft', () => {
    store().openWorkbench(['c1', 'c2']);
    const s = store();
    expect(s.open).toBe(true);
    expect(s.sourceItemIds).toEqual(['c1', 'c2']);
    expect(s.draft).toBe(DRAFT_TEMPLATE);
    expect(s.draft).toContain('name:');
    expect(s.draft).toContain('description:');
  });

  it('resets any previous scripts choice and validation', () => {
    useMergeStore.setState({
      scriptsFromItemId: 'c9',
      validation: okValidation,
    });
    store().openWorkbench(['c1', 'c2']);
    expect(store().scriptsFromItemId).toBeNull();
    expect(store().validation).toBeNull();
  });
});

describe('mergeStore.appendToDraft (the "→" splice path)', () => {
  it('appends a source paragraph separated by a blank line', () => {
    useMergeStore.setState({ draft: '---\nname: m\n---\nfirst' });
    store().appendToDraft('second paragraph');
    expect(store().draft).toBe('---\nname: m\n---\nfirst\n\nsecond paragraph\n');
  });

  it('starts an empty draft with the appended text alone', () => {
    useMergeStore.setState({ draft: '' });
    store().appendToDraft('only paragraph');
    expect(store().draft).toBe('only paragraph\n');
  });
});

describe('mergeStore scripts choice', () => {
  it('is a single choice that can be cleared', () => {
    store().setScriptsFrom('c1');
    expect(store().scriptsFromItemId).toBe('c1');
    store().setScriptsFrom('c2');
    expect(store().scriptsFromItemId).toBe('c2');
    store().setScriptsFrom(null);
    expect(store().scriptsFromItemId).toBeNull();
  });
});

describe('mergeStore.validate', () => {
  it('validates the draft against the composition names without scripts', async () => {
    mockValidate.mockResolvedValue(okValidation);
    useMergeStore.setState({ draft: 'D' });
    await store().validate(['existing-a']);
    expect(mockValidate).toHaveBeenCalledWith('D', ['existing-a'], false);
    expect(store().validation).toEqual(okValidation);
    expect(store().validating).toBe(false);
  });

  it('reports keepsScripts when a scripts source is chosen', async () => {
    mockValidate.mockResolvedValue(okValidation);
    useMergeStore.setState({ draft: 'D', scriptsFromItemId: 'c2' });
    await store().validate([]);
    expect(mockValidate).toHaveBeenCalledWith('D', [], true);
  });

  it('fails safe-closed on an IPC error: no validation, gate stays shut', async () => {
    mockValidate.mockRejectedValue(new Error('ipc down'));
    useMergeStore.setState({ draft: 'D', validation: okValidation });
    await store().validate([]);
    const s = store();
    expect(s.validation).toBeNull();
    expect(s.validating).toBe(false);
  });
});

describe('mergeStore.closeWorkbench', () => {
  it('closes and clears the session state', () => {
    useMergeStore.setState({
      open: true,
      sourceItemIds: ['c1'],
      draft: 'x',
      validation: okValidation,
    });
    store().closeWorkbench();
    const s = store();
    expect(s.open).toBe(false);
    expect(s.sourceItemIds).toEqual([]);
    expect(s.validation).toBeNull();
  });
});
