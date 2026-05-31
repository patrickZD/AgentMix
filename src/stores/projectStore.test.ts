import { beforeEach, describe, expect, it } from 'vitest';
import { useProjectStore } from './projectStore';
import { makeProject } from '@/test/fixtures';

beforeEach(() =>
  useProjectStore.setState({
    projects: [makeProject('p1'), makeProject('p2')],
    healthResults: [],
  }),
);

describe('projectStore', () => {
  it('addProject appends the project', () => {
    const before = useProjectStore.getState().projects.length;

    useProjectStore.getState().addProject(makeProject('new'));

    const projects = useProjectStore.getState().projects;
    expect(projects).toHaveLength(before + 1);
    expect(projects[projects.length - 1].id).toBe('new');
  });

  it('removeProject drops the project with the given id', () => {
    useProjectStore.getState().removeProject('p1');
    expect(useProjectStore.getState().projects.some((p) => p.id === 'p1')).toBe(false);
  });
});
