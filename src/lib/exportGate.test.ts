import { describe, expect, it } from 'vitest';
import { exportGate } from './exportGate';
import type { ExportConflict, ExportPlan, RuntimeConflict, SkillSecurityReport } from '@/types';

function plan(
  conflicts: ExportConflict[],
  opCount = 2,
  securityReports: SkillSecurityReport[] = [],
  runtimeWarnings: RuntimeConflict[] = [],
): ExportPlan {
  return {
    targets: [],
    operations: Array.from({ length: opCount }, (_, i) => ({
      kind: 'create',
      path: `C:/proj/.claude/skills/s/file${i}.md`,
      source: { type: 'path', path: `C:/src/s/file${i}.md` },
      size: 10,
      sourceAsset: 's',
      targetIndex: 0,
    })),
    conflicts,
    runtimeWarnings,
    backups: [],
    securityReports,
    totalBytes: 20,
  };
}

const riskyReport: SkillSecurityReport = {
  assetId: 'risky',
  sizeBytes: 100,
  oversize: false,
  binaryAssets: [],
  findings: [
    { rule: 'network-download-execute', file: 'scripts/x.sh', line: 1, snippet: 'curl x | sh' },
  ],
  requiresConfirmation: true,
};

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
const invalidName: ExportConflict = {
  kind: 'invalidName',
  exportedName: '../evil',
  assetIds: ['d'],
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

  it('blocks an unsafe exported name (not clearable in preview)', () => {
    const gate = exportGate(plan([invalidName]), true);
    expect(gate.canExport).toBe(false);
    expect(gate.invalidNames).toBe(1);
  });

  it('blocks a high-risk skill until its risk is acknowledged (per-skill)', () => {
    const p = plan([], 2, [riskyReport]);
    const unacked = exportGate(p, false, []);
    expect(unacked.canExport).toBe(false);
    expect(unacked.unacknowledgedRisks).toBe(1);

    const acked = exportGate(p, false, ['risky']);
    expect(acked.canExport).toBe(true);
    expect(acked.unacknowledgedRisks).toBe(0);
  });

  it('ignores reports that do not require confirmation', () => {
    const benign: SkillSecurityReport = { ...riskyReport, requiresConfirmation: false };
    const gate = exportGate(plan([], 2, [benign]), false, []);
    expect(gate.unacknowledgedRisks).toBe(0);
    expect(gate.canExport).toBe(true);
  });

  it('allows export despite runtime warnings (warning-level, never blocks)', () => {
    const warnings: RuntimeConflict[] = [
      { exportedName: 'code-review', kind: 'exportedWins', targetIndex: 0 },
      { exportedName: 'deploy', kind: 'bothActive', targetIndex: 0 },
    ];
    // RuntimeConflict is informational: the gate must not consider it.
    expect(exportGate(plan([], 2, [], warnings), false).canExport).toBe(true);
  });
});
