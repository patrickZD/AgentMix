import { beforeEach, describe, expect, it } from 'vitest';
import { useProjectStore } from './projectStore';
import { MOCK_PROJECTS } from '@/data/mockData';
import type { SourceProject } from '@/types';

beforeEach(() => useProjectStore.setState({ projects: MOCK_PROJECTS.map((p) => ({ ...p })) }));

describe('projectStore', () => {
  it('addProject appends the project', () => {
    const before = useProjectStore.getState().projects.length;
    const project: SourceProject = { id: 'new', name: 'new', path: '/x', skills: [] };

    useProjectStore.getState().addProject(project);

    const projects = useProjectStore.getState().projects;
    expect(projects).toHaveLength(before + 1);
    expect(projects[projects.length - 1].id).toBe('new');
  });

  it('removeProject drops the project with the given id', () => {
    const id = MOCK_PROJECTS[0].id;
    useProjectStore.getState().removeProject(id);
    expect(useProjectStore.getState().projects.some((p) => p.id === id)).toBe(false);
  });
});
