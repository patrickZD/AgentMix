import type { AssetCategory, HealthStatus, Skill } from '@/types';

// Source-panel filtering. Pure functions so the rules are unit-testable and the
// panel stays a thin renderer. Filtering by category/health uses the scan
// classification fields — it is not an asset-kind hard branch.

export interface SkillFilter {
  keyword: string;
  category: AssetCategory | 'all';
  health: HealthStatus | 'all';
}

export const EMPTY_FILTER: SkillFilter = {
  keyword: '',
  category: 'all',
  health: 'all',
};

// Apply the active filter. Invalid candidates are hidden unless the user opted
// to show them, or is explicitly filtering to the invalid category.
export function filterSkills(
  skills: Skill[],
  filter: SkillFilter,
  showInvalid: boolean,
): Skill[] {
  const keyword = filter.keyword.trim().toLowerCase();
  const allowInvalid = showInvalid || filter.category === 'invalid';

  return skills.filter((skill) => {
    if (skill.category === 'invalid' && !allowInvalid) return false;
    if (filter.category !== 'all' && skill.category !== filter.category) return false;
    if (filter.health !== 'all' && skill.healthStatus !== filter.health) return false;
    if (keyword) {
      const haystack = `${skill.name} ${skill.description}`.toLowerCase();
      if (!haystack.includes(keyword)) return false;
    }
    return true;
  });
}

export interface CategoryGroups {
  portable: Skill[];
  toolSpecific: Skill[];
  invalid: Skill[];
}

// Bucket already-filtered skills into the three scan categories for the tree.
export function groupByCategory(skills: Skill[]): CategoryGroups {
  return {
    portable: skills.filter((s) => s.category === 'portable'),
    toolSpecific: skills.filter((s) => s.category === 'tool-specific'),
    invalid: skills.filter((s) => s.category === 'invalid'),
  };
}
