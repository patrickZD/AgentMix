import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useExportStore } from './exportStore';
import { buildExportPlan } from '@/lib/exporter';
import type { ExportPlan } from '@/types';

vi.mock('@/lib/exporter', () => ({ buildExportPlan: vi.fn() }));
const mockBuild = vi.mocked(buildExportPlan);

const emptyPlan: ExportPlan = {
  targetDir: 'C:/proj/.claude/skills',
  operations: [{ kind: 'create', path: 'x', sourcePath: 'src/x', size: 1, sourceAsset: 'a' }],
  conflicts: [],
  backups: [],
  managedManifest: { manifestPath: 'm', managedAssets: [] },
  totalBytes: 1,
};

beforeEach(() => {
  mockBuild.mockReset();
  useExportStore.setState({
    targetPath: null,
    plan: null,
    building: false,
    buildError: null,
    overwriteConfirmed: false,
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

describe('exportStore.buildPlan', () => {
  it('does nothing without a target path', async () => {
    await useExportStore.getState().buildPlan([]);
    expect(mockBuild).not.toHaveBeenCalled();
  });

  it('builds and stores the plan for the chosen target', async () => {
    mockBuild.mockResolvedValue(emptyPlan);
    useExportStore.setState({ targetPath: 'C:/proj' });

    const items = [
      { assetId: 'a', sourceDir: 'C:/src/a', exportedName: 'a', sourceRef: 'p:a' },
    ];
    await useExportStore.getState().buildPlan(items);

    expect(mockBuild).toHaveBeenCalledWith(items, 'C:/proj');
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

describe('exportStore.resetPlan', () => {
  it('clears the plan and overwrite confirmation', () => {
    useExportStore.setState({ plan: emptyPlan, overwriteConfirmed: true });
    useExportStore.getState().resetPlan();
    const s = useExportStore.getState();
    expect(s.plan).toBeNull();
    expect(s.overwriteConfirmed).toBe(false);
  });
});
