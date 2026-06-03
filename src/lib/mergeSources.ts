import type { ComboItem, ExportConflict } from '@/types';

// Conflict-entry helpers for the merge workbench (T25). The workbench renders
// one source column per combo item, so a conflict can open it only when at
// least MERGE_MIN_SOURCES of its participants are combo items. Merged entries
// cannot be re-merged (they have no source SKILL.md to show as a column).
export const MERGE_MIN_SOURCES = 2;

export function mergeSourceIdsForConflict(
  conflict: ExportConflict,
  comboItems: ComboItem[],
): string[] {
  const comboIds = new Set(comboItems.map((c) => c.id));
  return conflict.assetIds.filter((id) => comboIds.has(id));
}

export function canMergeConflict(conflict: ExportConflict, comboItems: ComboItem[]): boolean {
  return mergeSourceIdsForConflict(conflict, comboItems).length >= MERGE_MIN_SOURCES;
}
