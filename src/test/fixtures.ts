// Shared test fixtures producing domain-shaped Skill / SourceProject values.
// Keep these aligned with src/types/generated.ts.

import type { Skill, SourceProject } from '@/types';

export function makeSkill(id: string, name: string, overrides: Partial<Skill> = {}): Skill {
  return {
    id,
    kind: 'skill',
    identityKey: name,
    sourceProjectId: overrides.sourceProjectId ?? '',
    category: 'portable',
    healthStatus: 'ok',
    healthIssues: [],
    name,
    description: '',
    compatibility: null,
    metadata: null,
    skillDirPath: '',
    relativePathInProject: name,
    hasScripts: false,
    skillMdContent: '',
    ...overrides,
  };
}

export function makeProject(
  id: string,
  overrides: Partial<SourceProject> = {},
): SourceProject {
  return {
    id,
    name: id,
    rootPath: '',
    isGitRepo: false,
    detectedAt: '0',
    lastCheckedAt: null,
    skills: [],
    ...overrides,
  };
}
