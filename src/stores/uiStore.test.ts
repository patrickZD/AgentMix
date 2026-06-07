import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useUiStore } from './uiStore';
import { makeSkill, makeProject } from '@/test/fixtures';

vi.mock('@/lib/appVersion', () => ({
  APP_VERSION: '0.0.0-test',
  readAppVersion: vi.fn(async () => '7.7.7'),
}));

beforeEach(() =>
  useUiStore.setState({
    view: 'main',
    showInvalid: false,
    leftCollapsed: false,
    selectedSkill: null,
    selectedProject: null,
    appVersion: '0.0.0-test',
  }),
);

describe('uiStore', () => {
  it('setView changes the active view', () => {
    useUiStore.getState().setView('health-check');
    expect(useUiStore.getState().view).toBe('health-check');
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

  it('loadAppVersion refines the label from the build-time seed to the running version', async () => {
    expect(useUiStore.getState().appVersion).toBe('0.0.0-test');
    await useUiStore.getState().loadAppVersion();
    expect(useUiStore.getState().appVersion).toBe('7.7.7');
  });
});
