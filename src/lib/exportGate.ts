import type { ExportPlan } from '@/types';

// Whether a built ExportPlan may be executed, and why not. NameCollision must be
// resolved in the combo (rename / keep one); TargetExists is cleared by an
// explicit overwrite confirmation in the preview (DESIGN.md §1.2); each
// high-risk security report must be acknowledged per-skill, no bulk bypass
// (DESIGN.md §1.11).
export interface ExportGate {
  canExport: boolean;
  nameCollisions: number;
  targetExists: number;
  // Exported names that are unsafe as a directory segment; must be renamed
  // (the Rust execute gate refuses them too — DESIGN.md §1.11).
  invalidNames: number;
  needsOverwriteConfirm: boolean;
  // High-risk reports still awaiting their per-skill acknowledgment.
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
      invalidNames: 0,
      needsOverwriteConfirm: false,
      unacknowledgedRisks: 0,
    };
  }
  const nameCollisions = plan.conflicts.filter((c) => c.kind === 'nameCollision').length;
  const targetExists = plan.conflicts.filter((c) => c.kind === 'targetExists').length;
  const invalidNames = plan.conflicts.filter((c) => c.kind === 'invalidName').length;
  const needsOverwriteConfirm = targetExists > 0 && !overwriteConfirmed;

  const riskReports = plan.securityReports.filter((r) => r.requiresConfirmation);
  const acknowledged = new Set(acknowledgedRiskIds);
  const unacknowledgedRisks = riskReports.filter((r) => !acknowledged.has(r.assetId)).length;

  const canExport =
    plan.operations.length > 0 &&
    nameCollisions === 0 &&
    invalidNames === 0 &&
    !needsOverwriteConfirm &&
    unacknowledgedRisks === 0;
  return {
    canExport,
    nameCollisions,
    targetExists,
    invalidNames,
    needsOverwriteConfirm,
    unacknowledgedRisks,
  };
}
