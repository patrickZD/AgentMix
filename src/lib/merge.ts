import { invoke } from '@tauri-apps/api/core';
import type { MergeDraftValidation } from '@/types';

// IPC seam for the merge-workbench draft validation (T24). The Rust command
// reuses parser/health and the exporter's safe-segment rule — the UI renders
// the result and never re-implements a second rule set (DESIGN.md §1.3).
export function validateMergeDraft(
  draft: string,
  existingNames: string[],
  keepsScripts: boolean,
): Promise<MergeDraftValidation> {
  return invoke<MergeDraftValidation>('validate_merge_draft', {
    draft,
    existingNames,
    keepsScripts,
  });
}
