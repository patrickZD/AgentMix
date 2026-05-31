import { invoke } from '@tauri-apps/api/core';
import type { SourceProject } from '@/types';

// Thin IPC wrappers around the Rust scan commands. Isolated in one module so
// the rest of the app (and unit tests) can mock a single seam instead of the
// whole Tauri API surface.

export function scanProject(path: string): Promise<SourceProject> {
  return invoke<SourceProject>('scan_project', { path });
}

// Opens the native folder picker. Resolves to the chosen path, or null if the
// user cancelled.
export function pickDirectory(): Promise<string | null> {
  return invoke<string | null>('pick_directory');
}
