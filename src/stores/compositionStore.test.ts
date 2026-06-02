import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useCompositionStore } from './compositionStore';
import { makeSkill, makeProject } from '@/test/fixtures';
import { detectConflicts } from '@/lib/composer';

vi.mock('@/lib/composer', () => ({ detectConflicts: vi.fn() }));
const mockDetect = vi.mocked(detectConflicts);

const store = () => useCompositionStore.getState();

beforeEach(() => {
  mockDetect.mockReset();
  useCompositionStore.setState({ comboItems: [], mergedItems: [], conflicts: [] });
});

describe('compositionStore selection', () => {
  it('adds a selected skill with exportedName defaulting to its name', () => {
    store().addToCombo(makeSkill('s1', 'code-review'), makeProject('p1'));
    expect(store().comboItems).toHaveLength(1);
    expect(store().comboItems[0].skill.id).toBe('s1');
    expect(store().comboItems[0].exportedName).toBe('code-review');
  });

  it('ignores the same skill added from the same project twice', () => {
    const skill = makeSkill('s1', 'code-review');
    const project = makeProject('p1');
    store().addToCombo(skill, project);
    store().addToCombo(skill, project);
    expect(store().comboItems).toHaveLength(1);
  });

  it('removeItem drops the item', () => {
    store().addToCombo(makeSkill('s1', 'code-review'), makeProject('p1'));
    const [item] = store().comboItems;
    store().removeItem(item.id);
    expect(store().comboItems).toHaveLength(0);
  });

  it('moveItem reorders adjacent items and is a no-op at the boundary', () => {
    store().addToCombo(makeSkill('s1', 'alpha'), makeProject('p1'));
    store().addToCombo(makeSkill('s2', 'beta'), makeProject('p1'));
    const [a, b] = store().comboItems;

    store().moveItem(b.id, 'up');
    expect(store().comboItems.map((c) => c.id)).toEqual([b.id, a.id]);
    store().moveItem(b.id, 'up');
    expect(store().comboItems.map((c) => c.id)).toEqual([b.id, a.id]);
  });

  it('removeItemsByProject removes every item of the project', () => {
    store().addToCombo(makeSkill('s1', 'alpha'), makeProject('p1'));
    store().addToCombo(makeSkill('s2', 'beta'), makeProject('p2'));
    store().removeItemsByProject('p1');
    expect(store().comboItems).toHaveLength(1);
    expect(store().comboItems[0].project.id).toBe('p2');
  });
});

describe('compositionStore conflict resolution', () => {
  it('renameItem changes only that item exportedName', () => {
    store().addToCombo(makeSkill('s1', 'code-review'), makeProject('p1'));
    store().addToCombo(makeSkill('s2', 'code-review'), makeProject('p2'));
    const [, second] = store().comboItems;

    store().renameItem(second.id, 'code-review-vercel');

    const items = store().comboItems;
    expect(items[0].exportedName).toBe('code-review');
    expect(items[1].exportedName).toBe('code-review-vercel');
  });

  it('keepOne drops the other items sharing the kept exported name (case-insensitive)', () => {
    store().addToCombo(makeSkill('s1', 'Code-Review'), makeProject('p1'));
    store().addToCombo(makeSkill('s2', 'code-review'), makeProject('p2'));
    store().addToCombo(makeSkill('s3', 'test-writer'), makeProject('p3'));
    const kept = store().comboItems[0];

    store().keepOne(kept.id);

    const ids = store().comboItems.map((c) => c.id);
    expect(ids).toContain(kept.id);
    expect(store().comboItems.find((c) => c.skill.id === 's2')).toBeUndefined();
    // An unrelated skill is untouched.
    expect(store().comboItems.find((c) => c.skill.id === 's3')).toBeDefined();
  });
});

describe('compositionStore.refreshConflicts', () => {
  it('sends the current candidates to the composer and stores the result', async () => {
    store().addToCombo(makeSkill('s1', 'code-review'), makeProject('p1'));
    store().addToCombo(makeSkill('s2', 'code-review'), makeProject('p2'));
    const ids = store().comboItems.map((c) => c.id);
    mockDetect.mockResolvedValue([
      { kind: 'nameCollision', exportedName: 'code-review', assetIds: ids },
    ]);

    await store().refreshConflicts();

    expect(mockDetect).toHaveBeenCalledWith([
      { id: ids[0], exportedName: 'code-review' },
      { id: ids[1], exportedName: 'code-review' },
    ]);
    expect(store().conflicts).toHaveLength(1);
    expect(store().conflicts[0].assetIds).toEqual(ids);
  });

  it('includes merged entries as conflict candidates', async () => {
    store().addToCombo(makeSkill('s1', 'alpha'), makeProject('p1'));
    const comboId = store().comboItems[0].id;
    store().addMergedItem(
      {
        name: 'merged-x',
        draft: '---\nname: merged-x\n---\n',
        scriptsFromDir: null,
        sourceSkillNames: ['a', 'b'],
      },
      [],
    );
    const mergedId = store().mergedItems[0].id;
    mockDetect.mockResolvedValue([]);

    await store().refreshConflicts();

    expect(mockDetect).toHaveBeenCalledWith([
      { id: comboId, exportedName: 'alpha' },
      { id: mergedId, exportedName: 'merged-x' },
    ]);
  });
});

describe('compositionStore merged entries (T24)', () => {
  it('removeMergedItem restores the items the merge had replaced (T25)', () => {
    store().addToCombo(makeSkill('s1', 'code-review'), makeProject('p1'));
    store().addToCombo(makeSkill('s2', 'code-review'), makeProject('p2'));
    const replacedIds = store().comboItems.map((c) => c.id);
    store().addMergedItem(
      {
        name: 'code-review',
        draft: '---\nname: code-review\n---\n',
        scriptsFromDir: null,
        sourceSkillNames: ['code-review', 'code-review'],
      },
      replacedIds,
    );
    expect(store().comboItems).toHaveLength(0);
    const mergedId = store().mergedItems[0].id;

    store().removeMergedItem(mergedId);

    // The merged entry is gone and the original (conflicting) items are back,
    // so the prior conflict state can be re-detected.
    expect(store().mergedItems).toHaveLength(0);
    expect(store().comboItems.map((c) => c.id)).toEqual(replacedIds);
  });

  it('addMergedItem replaces its source items and records them for restore', () => {
    store().addToCombo(makeSkill('s1', 'code-review'), makeProject('p1'));
    store().addToCombo(makeSkill('s2', 'code-review'), makeProject('p2'));
    store().addToCombo(makeSkill('s3', 'test-writer'), makeProject('p3'));
    const [a, b] = store().comboItems;

    store().addMergedItem(
      {
        name: 'code-review',
        draft: '---\nname: code-review\ndescription: Use when reviewing.\n---\n',
        scriptsFromDir: 'C:/src/b/code-review',
        sourceSkillNames: ['code-review', 'code-review'],
      },
      [a.id, b.id],
    );

    // The two merged sources left the combo; the unrelated item stays.
    expect(store().comboItems.map((c) => c.skill.id)).toEqual(['s3']);
    const merged = store().mergedItems;
    expect(merged).toHaveLength(1);
    expect(merged[0].name).toBe('code-review');
    expect(merged[0].scriptsFromDir).toBe('C:/src/b/code-review');
    // The replaced items are kept so removing the merged entry can restore them.
    expect(merged[0].replacedItems.map((r) => r.id)).toEqual([a.id, b.id]);
  });
});
