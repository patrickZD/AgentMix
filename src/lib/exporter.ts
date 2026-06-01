import { invoke } from '@tauri-apps/api/core';
import type { ExecutionReport, ExportPlan, ExportRequestItem } from '@/types';

// IPC seam for the Rust export pipeline. buildExportPlan writes nothing; execute
// is the only call that modifies user files. Tauri maps camelCase JS arg keys to
// the command's snake_case parameters.
export function buildExportPlan(
  items: ExportRequestItem[],
  targetProjectPath: string,
): Promise<ExportPlan> {
  return invoke<ExportPlan>('build_export_plan', { items, targetProjectPath });
}

export function executeExport(
  plan: ExportPlan,
  items: ExportRequestItem[],
  acknowledgedAssetIds: string[],
): Promise<ExecutionReport> {
  return invoke<ExecutionReport>('execute_export', { plan, items, acknowledgedAssetIds });
}

// Reveal a path in the OS file manager (used for "open backup folder").
export function openPath(path: string): Promise<void> {
  return invoke('open_path', { path });
}
