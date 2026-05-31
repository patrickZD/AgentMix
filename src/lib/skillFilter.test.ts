import { describe, expect, it } from 'vitest';
import { EMPTY_FILTER, filterSkills, groupByCategory } from './skillFilter';
import { makeSkill } from '@/test/fixtures';

const portable = makeSkill('s1', 'code-review', {
  category: 'portable',
  description: 'Reviews code for security issues',
});
const toolSpecific = makeSkill('s2', 'deploy', {
  category: 'tool-specific',
  healthStatus: 'warning',
  description: 'Deploys the app',
});
const invalid = makeSkill('s3', 'broken', {
  category: 'invalid',
  healthStatus: 'error',
});
const all = [portable, toolSpecific, invalid];

describe('filterSkills — invalid visibility', () => {
  it('hides invalid candidates by default', () => {
    const out = filterSkills(all, EMPTY_FILTER, false);
    expect(out.map((s) => s.id)).toEqual(['s1', 's2']);
  });

  it('shows invalid when showInvalid is on', () => {
    const out = filterSkills(all, EMPTY_FILTER, true);
    expect(out.map((s) => s.id)).toContain('s3');
  });

  it('shows invalid when explicitly filtering to the invalid category', () => {
    const out = filterSkills(all, { ...EMPTY_FILTER, category: 'invalid' }, false);
    expect(out.map((s) => s.id)).toEqual(['s3']);
  });
});

describe('filterSkills — keyword', () => {
  it('matches the name case-insensitively', () => {
    const out = filterSkills(all, { ...EMPTY_FILTER, keyword: 'CODE' }, false);
    expect(out.map((s) => s.id)).toEqual(['s1']);
  });

  it('matches the description', () => {
    const out = filterSkills(all, { ...EMPTY_FILTER, keyword: 'security' }, false);
    expect(out.map((s) => s.id)).toEqual(['s1']);
  });

  it('returns nothing when no name or description matches', () => {
    const out = filterSkills(all, { ...EMPTY_FILTER, keyword: 'zzz' }, true);
    expect(out).toHaveLength(0);
  });
});

describe('filterSkills — category and health', () => {
  it('restricts to a category', () => {
    const out = filterSkills(all, { ...EMPTY_FILTER, category: 'tool-specific' }, false);
    expect(out.map((s) => s.id)).toEqual(['s2']);
  });

  it('restricts to a health status', () => {
    const out = filterSkills(all, { ...EMPTY_FILTER, health: 'warning' }, true);
    expect(out.map((s) => s.id)).toEqual(['s2']);
  });
});

describe('groupByCategory', () => {
  it('buckets skills into the three scan categories', () => {
    const groups = groupByCategory(all);
    expect(groups.portable.map((s) => s.id)).toEqual(['s1']);
    expect(groups.toolSpecific.map((s) => s.id)).toEqual(['s2']);
    expect(groups.invalid.map((s) => s.id)).toEqual(['s3']);
  });
});
