import type { ExportPlan } from '@/types';

// Whether a built ExportPlan may be executed, and why not. NameCollision must be
// resolved in the combo (rename / keep one); TargetExists is cleared by an
// explicit overwrite confirmation in the preview (DESIGN.md §6.2).
export interface ExportGate {
  canExport: boolean;
  nameCollisions: number;
  targetExists: number;
  needsOverwriteConfirm: boolean;
}

export function exportGate(plan: ExportPlan | null, overwriteConfirmed: boolean): ExportGate {
  if (!plan) {
    return { canExport: false, nameCollisions: 0, targetExists: 0, needsOverwriteConfirm: false };
  }
  const nameCollisions = plan.conflicts.filter((c) => c.kind === 'nameCollision').length;
  const targetExists = plan.conflicts.filter((c) => c.kind === 'targetExists').length;
  const needsOverwriteConfirm = targetExists > 0 && !overwriteConfirmed;
  const canExport =
    plan.operations.length > 0 && nameCollisions === 0 && !needsOverwriteConfirm;
  return { canExport, nameCollisions, targetExists, needsOverwriteConfirm };
}
