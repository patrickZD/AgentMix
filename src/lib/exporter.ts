import { invoke } from '@tauri-apps/api/core';
import type { ExportPlan, ExportRequestItem } from '@/types';

// IPC seam for the Rust export planner. Builds the Dry-run plan; writes nothing
// (execute is a separate command in T13). Tauri maps camelCase JS arg keys to
// the command's snake_case parameters.
export function buildExportPlan(
  items: ExportRequestItem[],
  targetProjectPath: string,
): Promise<ExportPlan> {
  return invoke<ExportPlan>('build_export_plan', { items, targetProjectPath });
}
