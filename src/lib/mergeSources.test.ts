import { describe, expect, it } from 'vitest';
import { canMergeConflict, mergeSourceIdsForConflict, MERGE_MIN_SOURCES } from './mergeSources';
import { makeSkill, makeProject } from '@/test/fixtures';
import type { ComboItem, ExportConflict } from '@/types';

function combo(id: string, name: string): ComboItem {
  return { id, skill: makeSkill(`skill-${id}`, name), project: makeProject('p1'), exportedName: name };
}

function collision(assetIds: string[]): ExportConflict {
  return { kind: 'nameCollision', exportedName: 'code-review', assetIds };
}

describe('mergeSourceIdsForConflict (conflict-entry availability, T25)', () => {
  it('collects the conflicting combo items as merge sources', () => {
    const items = [combo('c1', 'code-review'), combo('c2', 'code-review'), combo('c3', 'other')];
    expect(mergeSourceIdsForConflict(collision(['c1', 'c2']), items)).toEqual(['c1', 'c2']);
  });

  it('drops ids that are not combo items (a merged entry cannot be re-merged)', () => {
    const items = [combo('c1', 'code-review')];
    expect(mergeSourceIdsForConflict(collision(['c1', 'merged-9']), items)).toEqual(['c1']);
  });

  it('canMergeConflict requires at least MERGE_MIN_SOURCES combo sources', () => {
    const items = [combo('c1', 'code-review'), combo('c2', 'code-review')];
    expect(MERGE_MIN_SOURCES).toBe(2);
    expect(canMergeConflict(collision(['c1', 'c2']), items)).toBe(true);
    expect(canMergeConflict(collision(['c1', 'merged-9']), items)).toBe(false);
  });
});
