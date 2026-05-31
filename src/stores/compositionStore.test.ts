import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useCompositionStore } from './compositionStore';
import { makeSkill, makeProject } from '@/test/fixtures';
import { detectConflicts } from '@/lib/composer';

vi.mock('@/lib/composer', () => ({ detectConflicts: vi.fn() }));
const mockDetect = vi.mocked(detectConflicts);

const store = () => useCompositionStore.getState();

beforeEach(() => {
  mockDetect.mockReset();
  useCompositionStore.setState({ comboItems: [], conflicts: [] });
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
    mockDetect.mockResolvedValue([{ exportedName: 'code-review', assetIds: ids }]);

    await store().refreshConflicts();

    expect(mockDetect).toHaveBeenCalledWith([
      { id: ids[0], exportedName: 'code-review' },
      { id: ids[1], exportedName: 'code-review' },
    ]);
    expect(store().conflicts).toHaveLength(1);
    expect(store().conflicts[0].assetIds).toEqual(ids);
  });
});
