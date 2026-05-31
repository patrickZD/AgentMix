import { describe, expect, it } from 'vitest';
import { exportGate } from './exportGate';
import type { ExportConflict, ExportPlan } from '@/types';

function plan(
  conflicts: ExportConflict[],
  opCount = 2,
): ExportPlan {
  return {
    targetDir: 'C:/proj/.claude/skills',
    operations: Array.from({ length: opCount }, (_, i) => ({
      kind: 'create',
      path: `C:/proj/.claude/skills/s/file${i}.md`,
      size: 10,
      sourceAsset: 's',
    })),
    conflicts,
    backups: [],
    managedManifest: { manifestPath: 'x', managedAssets: [] },
    totalBytes: 20,
  };
}

const nameCollision: ExportConflict = {
  kind: 'nameCollision',
  exportedName: 'code-review',
  assetIds: ['a', 'b'],
};
const targetExists: ExportConflict = {
  kind: 'targetExists',
  exportedName: 'deploy',
  assetIds: ['c'],
};

describe('exportGate', () => {
  it('blocks when there is no plan', () => {
    expect(exportGate(null, false).canExport).toBe(false);
  });

  it('allows export for a clean plan with operations', () => {
    expect(exportGate(plan([]), false).canExport).toBe(true);
  });

  it('blocks a plan with zero operations', () => {
    expect(exportGate(plan([], 0), false).canExport).toBe(false);
  });

  it('blocks while a name collision is unresolved (not clearable in preview)', () => {
    const gate = exportGate(plan([nameCollision]), true);
    expect(gate.canExport).toBe(false);
    expect(gate.nameCollisions).toBe(1);
  });

  it('blocks a target-exists conflict until overwrite is confirmed', () => {
    const unconfirmed = exportGate(plan([targetExists]), false);
    expect(unconfirmed.canExport).toBe(false);
    expect(unconfirmed.needsOverwriteConfirm).toBe(true);

    const confirmed = exportGate(plan([targetExists]), true);
    expect(confirmed.canExport).toBe(true);
    expect(confirmed.needsOverwriteConfirm).toBe(false);
  });
});
