import { create } from 'zustand';
import { checkForUpdate, installUpdate } from '@/lib/updater';
import type { UpdateDownloadProgress } from '@/types';

// Update-check UI state (DESIGN.md §1.16, T21): badge, modal, the persisted
// "skip this version" choice and the auto-check switch. Persistence uses the
// same mechanism as the language choice (localStorage, see i18n/index.ts).
const SKIPPED_VERSION_KEY = 'agentmix.skippedUpdateVersion';
const AUTO_CHECK_KEY = 'agentmix.autoCheckUpdates';

function readStored(key: string): string | null {
  return typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
}

function writeStored(key: string, value: string): void {
  if (typeof localStorage !== 'undefined') localStorage.setItem(key, value);
}

// The red badge shows for an available version the user has not skipped. A
// release newer than the skipped one prompts again (skip is per-version).
export function isBadgeVisible(
  availableVersion: string | null,
  skippedVersion: string | null,
): boolean {
  return availableVersion !== null && availableVersion !== skippedVersion;
}

interface UpdateState {
  /** Latest release version when one is newer than the running app. */
  availableVersion: string | null;
  /** Release notes (GitHub release body) for the modal. */
  notes: string | null;
  checking: boolean;
  /** True right after a check found no update ("you're up to date"). */
  upToDate: boolean;
  modalOpen: boolean;
  /** Version the user chose "skip this version" for (persisted). */
  skippedVersion: string | null;
  /** The settings switch; default on, persisted (T21). */
  autoCheckEnabled: boolean;
  installing: boolean;
  progress: UpdateDownloadProgress | null;
  installError: string | null;
  /** `force` skips the backend's 24h cache (manual "check now"). */
  check: (force: boolean) => Promise<void>;
  /** Launch-time check; no-op while the auto-check switch is off. */
  startupCheck: () => Promise<void>;
  openModal: () => void;
  /** "Later": close the modal, keep the badge, prompt again next launch. */
  deferUpdate: () => void;
  /** "Skip this version": persist the version so it never prompts again. */
  skipThisVersion: () => void;
  setAutoCheck: (enabled: boolean) => void;
  install: () => Promise<void>;
  setProgress: (progress: UpdateDownloadProgress) => void;
}

export const useUpdateStore = create<UpdateState>((set, get) => ({
  availableVersion: null,
  notes: null,
  checking: false,
  upToDate: false,
  modalOpen: false,
  skippedVersion: readStored(SKIPPED_VERSION_KEY),
  autoCheckEnabled: readStored(AUTO_CHECK_KEY) !== 'false',
  installing: false,
  progress: null,
  installError: null,

  check: async (force) => {
    set({ checking: true, upToDate: false });
    try {
      const result = await checkForUpdate(force);
      set({
        checking: false,
        availableVersion: result.available ? result.version : null,
        notes: result.available ? result.notes : null,
        upToDate: !result.available,
      });
    } catch {
      // Fail quiet (§1.16): the backend already reports network failure as
      // no-update; an IPC error must not surface an error dialog either.
      set({ checking: false });
    }
  },

  startupCheck: async () => {
    if (!get().autoCheckEnabled) return;
    await get().check(false);
  },

  openModal: () => set({ modalOpen: true }),

  deferUpdate: () => set({ modalOpen: false }),

  skipThisVersion: () => {
    const version = get().availableVersion;
    if (version) writeStored(SKIPPED_VERSION_KEY, version);
    set({ modalOpen: false, skippedVersion: version });
  },

  setAutoCheck: (enabled) => {
    writeStored(AUTO_CHECK_KEY, String(enabled));
    set({ autoCheckEnabled: enabled });
  },

  install: async () => {
    set({ installing: true, installError: null, progress: null });
    try {
      await installUpdate();
      // On success the backend restarts the app; nothing to reset here.
    } catch (e) {
      set({ installing: false, installError: String(e) });
    }
  },

  setProgress: (progress) => set({ progress }),
}));
