import { invoke } from '@tauri-apps/api/core';
import type { ConflictCandidate, ExportConflict } from '@/types';

// IPC seam for the Rust composer. The frontend never re-implements the conflict
// rule; it sends the candidates and renders whatever the authoritative
// detection returns (the same function builds the ExportPlan in T11).
export function detectConflicts(candidates: ConflictCandidate[]): Promise<ExportConflict[]> {
  return invoke<ExportConflict[]>('detect_conflicts', { candidates });
}
