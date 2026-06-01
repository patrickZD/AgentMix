import type { ExportPlan } from '@/types';

// Whether a built ExportPlan may be executed, and why not. NameCollision must be
// resolved in the combo (rename / keep one); TargetExists is cleared by an
// explicit overwrite confirmation in the preview (DESIGN.md §6.2); each
// high-risk security report must be acknowledged per-skill, no bulk bypass
// (DESIGN.md §6.11).
export interface ExportGate {
  canExport: boolean;
  nameCollisions: number;
  targetExists: number;
  needsOverwriteConfirm: boolean;
  // Reports that require confirmation, and how many are still unacknowledged.
  risks: number;
  unacknowledgedRisks: number;
}

export function exportGate(
  plan: ExportPlan | null,
  overwriteConfirmed: boolean,
  acknowledgedRiskIds: string[] = [],
): ExportGate {
  if (!plan) {
    return {
      canExport: false,
      nameCollisions: 0,
      targetExists: 0,
      needsOverwriteConfirm: false,
      risks: 0,
      unacknowledgedRisks: 0,
    };
  }
  const nameCollisions = plan.conflicts.filter((c) => c.kind === 'nameCollision').length;
  const targetExists = plan.conflicts.filter((c) => c.kind === 'targetExists').length;
  const needsOverwriteConfirm = targetExists > 0 && !overwriteConfirmed;

  const riskReports = plan.securityReports.filter((r) => r.requiresConfirmation);
  const acknowledged = new Set(acknowledgedRiskIds);
  const unacknowledgedRisks = riskReports.filter((r) => !acknowledged.has(r.assetId)).length;

  const canExport =
    plan.operations.length > 0 &&
    nameCollisions === 0 &&
    !needsOverwriteConfirm &&
    unacknowledgedRisks === 0;
  return {
    canExport,
    nameCollisions,
    targetExists,
    needsOverwriteConfirm,
    risks: riskReports.length,
    unacknowledgedRisks,
  };
}
