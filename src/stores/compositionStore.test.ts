import { beforeEach, describe, expect, it } from 'vitest';
import { useCompositionStore } from './compositionStore';
import { makeSkill, makeProject } from '@/test/fixtures';

const store = () => useCompositionStore.getState();

beforeEach(() => useCompositionStore.setState({ comboItems: [] }));

describe('compositionStore.addToCombo', () => {
  it('adds a selected skill to the combo', () => {
    store().addToCombo(makeSkill('s1', 'code-review'), makeProject('p1'));
    expect(store().comboItems).toHaveLength(1);
    expect(store().comboItems[0].skill.id).toBe('s1');
    expect(store().comboItems[0].hasConflict).toBe(false);
  });

  it('ignores the same skill added from the same project twice', () => {
    const skill = makeSkill('s1', 'code-review');
    const project = makeProject('p1');
    store().addToCombo(skill, project);
    store().addToCombo(skill, project);
    expect(store().comboItems).toHaveLength(1);
  });

  it('flags both items when the same skill name comes from different projects', () => {
    store().addToCombo(makeSkill('s1', 'code-review'), makeProject('p1'));
    store().addToCombo(makeSkill('s2', 'code-review'), makeProject('p2'));
    const items = store().comboItems;
    expect(items).toHaveLength(2);
    expect(items[0].hasConflict).toBe(true);
    expect(items[1].hasConflict).toBe(true);
    expect(items[0].conflictWith).toBe(items[1].id);
    expect(items[1].conflictWith).toBe(items[0].id);
  });

  it('does not flag a conflict for different skill names', () => {
    store().addToCombo(makeSkill('s1', 'code-review'), makeProject('p1'));
    store().addToCombo(makeSkill('s2', 'test-writer'), makeProject('p2'));
    expect(store().comboItems.every((c) => !c.hasConflict)).toBe(true);
  });
});

describe('compositionStore.removeItem', () => {
  it('removes the item and clears the conflict flag on its counterpart', () => {
    store().addToCombo(makeSkill('s1', 'code-review'), makeProject('p1'));
    store().addToCombo(makeSkill('s2', 'code-review'), makeProject('p2'));
    const [first, second] = store().comboItems;

    store().removeItem(second.id);

    const remaining = store().comboItems;
    expect(remaining).toHaveLength(1);
    expect(remaining[0].id).toBe(first.id);
    expect(remaining[0].hasConflict).toBe(false);
    expect(remaining[0].conflictWith).toBeUndefined();
  });
});

describe('compositionStore.moveItem', () => {
  it('reorders adjacent items and is a no-op at the boundary', () => {
    store().addToCombo(makeSkill('s1', 'alpha'), makeProject('p1'));
    store().addToCombo(makeSkill('s2', 'beta'), makeProject('p1'));
    const [a, b] = store().comboItems;

    store().moveItem(b.id, 'up');
    expect(store().comboItems.map((c) => c.id)).toEqual([b.id, a.id]);

    // b is now first; moving it up again must not change anything.
    store().moveItem(b.id, 'up');
    expect(store().comboItems.map((c) => c.id)).toEqual([b.id, a.id]);
  });
});

describe('compositionStore.removeItemsByProject', () => {
  it('removes every combo item belonging to the project', () => {
    store().addToCombo(makeSkill('s1', 'alpha'), makeProject('p1'));
    store().addToCombo(makeSkill('s2', 'beta'), makeProject('p2'));

    store().removeItemsByProject('p1');

    expect(store().comboItems).toHaveLength(1);
    expect(store().comboItems[0].project.id).toBe('p2');
  });
});
