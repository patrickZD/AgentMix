import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RECENT_TARGET_PATHS_MAX, useExportStore } from './exportStore';
import { buildExportPlan, executeExport } from '@/lib/exporter';
import type { ExecutionReport, ExportPlan } from '@/types';

vi.mock('@/lib/exporter', () => ({ buildExportPlan: vi.fn(), executeExport: vi.fn() }));
const mockBuild = vi.mocked(buildExportPlan);
const mockExecute = vi.mocked(executeExport);

// The recents list persists like the language choice does (localStorage);
// vitest runs in node, so provide a minimal in-memory stand-in.
function stubLocalStorage(): Map<string, string> {
  const backing = new Map<string, string>();
  globalThis.localStorage = {
    getItem: (k: string) => backing.get(k) ?? null,
    setItem: (k: string, v: string) => void backing.set(k, v),
    removeItem: (k: string) => void backing.delete(k),
    clear: () => backing.clear(),
    key: () => null,
    get length() {
      return backing.size;
    },
  } as Storage;
  return backing;
}

const emptyPlan: ExportPlan = {
  targets: [],
  operations: [
    {
      kind: 'create',
      path: 'x',
      source: { type: 'path', path: 'src/x' },
      size: 1,
      sourceAsset: 'a',
      targetIndex: 0,
    },
  ],
  conflicts: [],
  backups: [],
  securityReports: [],
  totalBytes: 1,
};

const report: ExecutionReport = {
  targetDir: 'C:/proj/.claude/skills',
  skillsExported: 1,
  filesCreated: 1,
  filesOverwritten: 0,
  backupArchive: null,
};

let stored: Map<string, string>;

beforeEach(() => {
  mockBuild.mockReset();
  mockExecute.mockReset();
  stored = stubLocalStorage();
  useExportStore.setState({
    targetPath: null,
    recentTargetPaths: [],
    selectedTargets: [{ tool: 'claude-code', scope: 'project', customPath: null }],
    plan: null,
    building: false,
    buildError: null,
    overwriteConfirmed: false,
    acknowledgedRiskIds: [],
    executing: false,
    executeError: null,
    report: null,
  });
});

describe('exportStore.setTargetPath', () => {
  it('sets the path and invalidates any existing preview', () => {
    useExportStore.setState({ plan: emptyPlan, overwriteConfirmed: true });
    useExportStore.getState().setTargetPath('C:/proj');
    const s = useExportStore.getState();
    expect(s.targetPath).toBe('C:/proj');
    expect(s.plan).toBeNull();
    expect(s.overwriteConfirmed).toBe(false);
  });
});

describe('exportStore recent target paths (T26)', () => {
  it('records each chosen target at the front of the recents', () => {
    useExportStore.getState().setTargetPath('C:/proj-a');
    useExportStore.getState().setTargetPath('C:/proj-b');
    expect(useExportStore.getState().recentTargetPaths).toEqual(['C:/proj-b', 'C:/proj-a']);
  });

  it('dedupes by normalized path (case + separators), moving the hit to the front', () => {
    useExportStore.getState().setTargetPath('C:/proj-a');
    useExportStore.getState().setTargetPath('C:/proj-b');
    // Same directory as proj-a, spelled differently (Windows rule).
    useExportStore.getState().setTargetPath('c:\\Proj-A');
    expect(useExportStore.getState().recentTargetPaths).toEqual(['c:\\Proj-A', 'C:/proj-b']);
  });

  it('caps the list at RECENT_TARGET_PATHS_MAX', () => {
    for (let i = 0; i < RECENT_TARGET_PATHS_MAX + 2; i++) {
      useExportStore.getState().setTargetPath(`C:/proj-${i}`);
    }
    const recents = useExportStore.getState().recentTargetPaths;
    expect(recents).toHaveLength(RECENT_TARGET_PATHS_MAX);
    expect(recents[0]).toBe(`C:/proj-${RECENT_TARGET_PATHS_MAX + 1}`);
  });

  it('persists the list so it survives a restart', () => {
    useExportStore.getState().setTargetPath('C:/proj-a');
    expect(JSON.parse(stored.get('agentmix.recentTargetPaths') ?? '[]')).toEqual(['C:/proj-a']);
  });

  it('clearing the target records nothing', () => {
    useExportStore.getState().setTargetPath(null);
    expect(useExportStore.getState().recentTargetPaths).toEqual([]);
    expect(stored.has('agentmix.recentTargetPaths')).toBe(false);
  });
});

describe('exportStore target selection (T33)', () => {
  it('adds a tool (default project scope) and removes it on toggle', () => {
    const store = useExportStore.getState();
    store.toggleTarget('cursor');
    expect(useExportStore.getState().selectedTargets).toEqual([
      { tool: 'claude-code', scope: 'project', customPath: null },
      { tool: 'cursor', scope: 'project', customPath: null },
    ]);
    useExportStore.getState().toggleTarget('cursor');
    expect(useExportStore.getState().selectedTargets).toEqual([
      { tool: 'claude-code', scope: 'project', customPath: null },
    ]);
  });

  it('switches a selected tool between project and global scope', () => {
    useExportStore.getState().setTargetScope('claude-code', 'global');
    expect(useExportStore.getState().selectedTargets).toEqual([
      { tool: 'claude-code', scope: 'global', customPath: null },
    ]);
  });

  it('invalidates a built preview when the target set changes', () => {
    useExportStore.setState({ plan: emptyPlan, overwriteConfirmed: true });
    useExportStore.getState().toggleTarget('cursor');
    const s = useExportStore.getState();
    expect(s.plan).toBeNull();
    expect(s.overwriteConfirmed).toBe(false);
  });

  it('invalidates a built preview when a scope changes', () => {
    useExportStore.setState({ plan: emptyPlan, overwriteConfirmed: true });
    useExportStore.getState().setTargetScope('claude-code', 'global');
    expect(useExportStore.getState().plan).toBeNull();
  });
});

describe('exportStore.buildPlan', () => {
  it('does nothing without a target path when a project-scope target is selected', async () => {
    await useExportStore.getState().buildPlan([]);
    expect(mockBuild).not.toHaveBeenCalled();
  });

  it('does nothing when no targets are selected', async () => {
    useExportStore.setState({ targetPath: 'C:/proj', selectedTargets: [] });
    await useExportStore.getState().buildPlan([]);
    expect(mockBuild).not.toHaveBeenCalled();
  });

  it('builds for a global-only target without requiring a project path', async () => {
    mockBuild.mockResolvedValue(emptyPlan);
    useExportStore.setState({
      targetPath: null,
      selectedTargets: [{ tool: 'claude-code', scope: 'global', customPath: null }],
    });

    await useExportStore.getState().buildPlan([]);

    // Global-scope export resolves under home, so an empty project path is passed.
    expect(mockBuild).toHaveBeenCalledWith(
      [],
      [{ tool: 'claude-code', scope: 'global', customPath: null }],
      '',
    );
    expect(useExportStore.getState().plan).toEqual(emptyPlan);
  });

  it('builds and stores the plan for the chosen targets', async () => {
    mockBuild.mockResolvedValue(emptyPlan);
    useExportStore.setState({ targetPath: 'C:/proj' });

    const items = [
      {
        assetId: 'a',
        source: { type: 'directory' as const, dir: 'C:/src/a' },
        exportedName: 'a',
        sourceRef: 'p:a',
      },
    ];
    await useExportStore.getState().buildPlan(items);

    expect(mockBuild).toHaveBeenCalledWith(
      items,
      [{ tool: 'claude-code', scope: 'project', customPath: null }],
      'C:/proj',
    );
    const s = useExportStore.getState();
    expect(s.plan).toEqual(emptyPlan);
    expect(s.building).toBe(false);
    expect(s.buildError).toBeNull();
  });

  it('surfaces a build failure in buildError', async () => {
    mockBuild.mockRejectedValue(new Error('not a directory: C:/missing'));
    useExportStore.setState({ targetPath: 'C:/missing' });

    await useExportStore.getState().buildPlan([]);

    const s = useExportStore.getState();
    expect(s.buildError).toBe('not a directory: C:/missing');
    expect(s.plan).toBeNull();
    expect(s.building).toBe(false);
  });
});

describe('exportStore.execute', () => {
  it('does nothing without a plan', async () => {
    await useExportStore.getState().execute([]);
    expect(mockExecute).not.toHaveBeenCalled();
  });

  it('runs the plan, stores the report and spends the plan', async () => {
    mockExecute.mockResolvedValue(report);
    useExportStore.setState({ plan: emptyPlan });
    const items = [
      {
        assetId: 'a',
        source: { type: 'directory' as const, dir: 'C:/src/a' },
        exportedName: 'a',
        sourceRef: 'p:a',
      },
    ];

    await useExportStore.getState().execute(items);

    expect(mockExecute).toHaveBeenCalledWith(emptyPlan, items, [], false);
    const s = useExportStore.getState();
    expect(s.report).toEqual(report);
    expect(s.plan).toBeNull();
    expect(s.executing).toBe(false);
  });

  it('passes only acknowledged risk ids to execute (per-skill, no bulk bypass)', async () => {
    mockExecute.mockResolvedValue(report);
    useExportStore.setState({ plan: emptyPlan });
    const items = [
      {
        assetId: 'a',
        source: { type: 'directory' as const, dir: 'C:/src/a' },
        exportedName: 'a',
        sourceRef: 'p:a',
      },
    ];

    const store = useExportStore.getState();
    store.acknowledgeRisk('a', true);
    store.acknowledgeRisk('b', true);
    store.acknowledgeRisk('b', false); // toggled back off
    await useExportStore.getState().execute(items);

    expect(mockExecute).toHaveBeenCalledWith(emptyPlan, items, ['a'], false);
  });

  it('forwards the overwrite confirmation to execute', async () => {
    mockExecute.mockResolvedValue(report);
    useExportStore.setState({ plan: emptyPlan, overwriteConfirmed: true });
    const items = [
      {
        assetId: 'a',
        source: { type: 'directory' as const, dir: 'C:/src/a' },
        exportedName: 'a',
        sourceRef: 'p:a',
      },
    ];

    await useExportStore.getState().execute(items);

    expect(mockExecute).toHaveBeenCalledWith(emptyPlan, items, [], true);
  });

  it('surfaces an execution failure in executeError and keeps the plan', async () => {
    mockExecute.mockRejectedValue(new Error('disk full'));
    useExportStore.setState({ plan: emptyPlan });

    await useExportStore.getState().execute([]);

    const s = useExportStore.getState();
    expect(s.executeError).toBe('disk full');
    expect(s.report).toBeNull();
    expect(s.plan).toEqual(emptyPlan);
  });
});

describe('exportStore.resetPlan', () => {
  it('clears the plan and overwrite confirmation', () => {
    useExportStore.setState({ plan: emptyPlan, overwriteConfirmed: true });
    useExportStore.getState().resetPlan();
    const s = useExportStore.getState();
    expect(s.plan).toBeNull();
    expect(s.overwriteConfirmed).toBe(false);
  });
});
