import { invoke } from '@tauri-apps/api/core';
import type { UpdateCheckResult, UpdateDownloadProgress } from '@/types';

// IPC seam for the Rust updater commands (T20/T21). check_for_update is
// fail-quiet on the backend (network failure = no-update); install_update
// downloads, verifies the signature, replaces the install and restarts.
// `force` skips the 24h check cache for the manual "check now" action.
export function checkForUpdate(force: boolean): Promise<UpdateCheckResult> {
  return invoke<UpdateCheckResult>('check_for_update', { force });
}

export function installUpdate(): Promise<void> {
  return invoke('install_update');
}

// Subscribe to the download-progress events install_update emits. Imported
// lazily and guarded like the drag-drop hook in MainLayout: outside a Tauri
// webview (plain `vite dev`) this resolves to a no-op unsubscribe.
export async function onUpdateDownloadProgress(
  handler: (progress: UpdateDownloadProgress) => void,
): Promise<() => void> {
  try {
    const { listen } = await import('@tauri-apps/api/event');
    return await listen<UpdateDownloadProgress>('update-download-progress', (event) =>
      handler(event.payload),
    );
  } catch {
    return () => {};
  }
}
