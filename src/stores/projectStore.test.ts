import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useProjectStore } from './projectStore';
import { makeProject } from '@/test/fixtures';
import { scanProject } from '@/lib/scan';

vi.mock('@/lib/scan', () => ({ scanProject: vi.fn() }));
const mockScan = vi.mocked(scanProject);

beforeEach(() => {
  mockScan.mockReset();
  useProjectStore.setState({
    projects: [],
    scanning: false,
    scanError: null,
  });
});

describe('projectStore mutations', () => {
  it('addProject appends the project', () => {
    useProjectStore.setState({ projects: [makeProject('p1')] });

    useProjectStore.getState().addProject(makeProject('new'));

    const projects = useProjectStore.getState().projects;
    expect(projects).toHaveLength(2);
    expect(projects[projects.length - 1].id).toBe('new');
  });

  it('removeProject drops the project with the given id', () => {
    useProjectStore.setState({ projects: [makeProject('p1'), makeProject('p2')] });
    useProjectStore.getState().removeProject('p1');
    expect(useProjectStore.getState().projects.some((p) => p.id === 'p1')).toBe(false);
  });
});

describe('projectStore.scanAndAdd', () => {
  it('adds the scanned project and clears the scanning flag', async () => {
    mockScan.mockResolvedValue(makeProject('p1', { rootPath: 'C:/work/alpha' }));

    await useProjectStore.getState().scanAndAdd('C:/work/alpha');

    const state = useProjectStore.getState();
    expect(mockScan).toHaveBeenCalledWith('C:/work/alpha');
    expect(state.projects).toHaveLength(1);
    expect(state.scanning).toBe(false);
    expect(state.scanError).toBeNull();
  });

  it('replaces a project re-scanned from the same path (case-insensitive)', async () => {
    mockScan.mockResolvedValueOnce(
      makeProject('p1', { rootPath: 'C:/work/alpha', name: 'old' }),
    );
    await useProjectStore.getState().scanAndAdd('C:/work/alpha');

    // Re-scan with different casing / separators must update in place, not dup.
    mockScan.mockResolvedValueOnce(
      makeProject('p2', { rootPath: 'c:\\work\\alpha', name: 'new' }),
    );
    await useProjectStore.getState().scanAndAdd('c:\\work\\alpha');

    const projects = useProjectStore.getState().projects;
    expect(projects).toHaveLength(1);
    expect(projects[0].name).toBe('new');
  });

  it('surfaces a scan failure in scanError without changing projects', async () => {
    useProjectStore.setState({ projects: [makeProject('existing')] });
    mockScan.mockRejectedValue(new Error('not a directory: C:/missing'));

    await useProjectStore.getState().scanAndAdd('C:/missing');

    const state = useProjectStore.getState();
    expect(state.scanError).toBe('not a directory: C:/missing');
    expect(state.scanning).toBe(false);
    expect(state.projects).toHaveLength(1);
    expect(state.projects[0].id).toBe('existing');
  });
});
