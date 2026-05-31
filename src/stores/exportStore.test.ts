import { beforeEach, describe, expect, it } from 'vitest';
import { useExportStore } from './exportStore';
import { MOCK_EXPORT_TARGETS } from '@/data/mockData';

beforeEach(() =>
  useExportStore.setState({ exportTargets: MOCK_EXPORT_TARGETS.map((t) => ({ ...t })) }),
);

describe('exportStore.toggleTarget', () => {
  it('flips enabled only for the target with the given id', () => {
    const [first, second] = useExportStore.getState().exportTargets;
    const before = first.enabled;

    useExportStore.getState().toggleTarget(first.id, !before);

    const after = useExportStore.getState().exportTargets;
    expect(after.find((t) => t.id === first.id)?.enabled).toBe(!before);
    expect(after.find((t) => t.id === second.id)?.enabled).toBe(second.enabled);
  });
});
