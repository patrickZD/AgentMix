import { beforeEach, describe, expect, it } from 'vitest';
import { useUiStore } from './uiStore';
import { makeSkill, makeProject } from '@/test/fixtures';

beforeEach(() =>
  useUiStore.setState({
    view: 'main',
    simpleMode: false,
    showInvalid: false,
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

  it('toggleShowInvalid flips showInvalid', () => {
    expect(useUiStore.getState().showInvalid).toBe(false);
    useUiStore.getState().toggleShowInvalid();
    expect(useUiStore.getState().showInvalid).toBe(true);
  });

  it('selectSkill records both the skill and its project', () => {
    const skill = makeSkill('s1', 'code-review', { sourceProjectId: 'p1' });
    const project = makeProject('p1');

    useUiStore.getState().selectSkill(skill, project);

    expect(useUiStore.getState().selectedSkill?.id).toBe('s1');
    expect(useUiStore.getState().selectedProject?.id).toBe('p1');
  });
});
