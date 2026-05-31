import { beforeEach, describe, expect, it } from 'vitest';
import { useUiStore } from './uiStore';
import type { Skill, SourceProject } from '@/types';

beforeEach(() =>
  useUiStore.setState({
    view: 'main',
    simpleMode: false,
    leftCollapsed: false,
    selectedSkill: null,
    selectedProject: null,
  }),
);

describe('uiStore', () => {
  it('setView changes the active view', () => {
    useUiStore.getState().setView('health-check');
    expect(useUiStore.getState().view).toBe('health-check');
  });

  it('toggleSimpleMode flips simpleMode', () => {
    expect(useUiStore.getState().simpleMode).toBe(false);
    useUiStore.getState().toggleSimpleMode();
    expect(useUiStore.getState().simpleMode).toBe(true);
  });

  it('selectSkill records both the skill and its project', () => {
    const skill: Skill = {
      id: 's1',
      name: 'code-review',
      displayName: 'code-review',
      status: 'healthy',
      changeTag: null,
      description: '',
      content: '',
      frontmatter: { name: 'code-review' },
      projectId: 'p1',
    };
    const project: SourceProject = { id: 'p1', name: 'p1', path: '', skills: [] };

    useUiStore.getState().selectSkill(skill, project);

    expect(useUiStore.getState().selectedSkill?.id).toBe('s1');
    expect(useUiStore.getState().selectedProject?.id).toBe('p1');
  });
});
