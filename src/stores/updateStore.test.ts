import { beforeEach, describe, expect, it, vi } from 'vitest';
import { isBadgeVisible, useUpdateStore } from './updateStore';
import { checkForUpdate, installUpdate } from '@/lib/updater';
import type { UpdateCheckResult } from '@/types';

vi.mock('@/lib/updater', () => ({ checkForUpdate: vi.fn(), installUpdate: vi.fn() }));
const mockCheck = vi.mocked(checkForUpdate);
const mockInstall = vi.mocked(installUpdate);

const updateFound: UpdateCheckResult = {
  available: true,
  version: '0.1.5',
  notes: 'release notes',
};
const noUpdate: UpdateCheckResult = { available: false, version: null, notes: null };

// The store persists like the language choice does (localStorage); vitest runs
// in a node environment, so provide a minimal in-memory stand-in.
function stubLocalStorage(): Map<string, string> {
  const backing = new Map<string, string>();
  globalThis.localStorage = {
    getItem: (k: string) => backing.get(k) ?? null,
    setItem: (k: string, v: string) => void backing.set(k, v),
    removeItem: (k: string) => void backing.delete(k),
    clear: () => backing.clear(),
    key: () => null,
    get length() {
      return backing.size;
    },
  } as Storage;
  return backing;
}

let stored: Map<string, string>;

beforeEach(() => {
  mockCheck.mockReset();
  mockInstall.mockReset();
  stored = stubLocalStorage();
  useUpdateStore.setState({
    availableVersion: null,
    notes: null,
    checking: false,
    upToDate: false,
    modalOpen: false,
    skippedVersion: null,
    autoCheckEnabled: true,
    installing: false,
    progress: null,
    installError: null,
  });
});

describe('updateStore.startupCheck (auto-check gate)', () => {
  it('does not check when the auto-check switch is off', async () => {
    useUpdateStore.setState({ autoCheckEnabled: false });
    await useUpdateStore.getState().startupCheck();
    expect(mockCheck).not.toHaveBeenCalled();
  });

  it('forces a fresh network check every launch (not a cached result) and records it', async () => {
    mockCheck.mockResolvedValue(updateFound);
    await useUpdateStore.getState().startupCheck();
    expect(mockCheck).toHaveBeenCalledWith(true);
    const s = useUpdateStore.getState();
    expect(s.availableVersion).toBe('0.1.5');
    expect(s.notes).toBe('release notes');
  });
});

describe('updateStore.check', () => {
  it('passes force=true through for the manual "check now" action', async () => {
    mockCheck.mockResolvedValue(noUpdate);
    await useUpdateStore.getState().check(true);
    expect(mockCheck).toHaveBeenCalledWith(true);
  });

  it('flags upToDate when no update is available', async () => {
    mockCheck.mockResolvedValue(noUpdate);
    await useUpdateStore.getState().check(true);
    const s = useUpdateStore.getState();
    expect(s.upToDate).toBe(true);
    expect(s.availableVersion).toBeNull();
  });

  it('fails quiet on an IPC error: no throw, checking resets', async () => {
    mockCheck.mockRejectedValue(new Error('ipc down'));
    await useUpdateStore.getState().check(false);
    const s = useUpdateStore.getState();
    expect(s.checking).toBe(false);
    expect(s.availableVersion).toBeNull();
  });
});

describe('update badge visibility', () => {
  it('is visible when an update is available and not skipped', () => {
    expect(isBadgeVisible('0.1.5', null)).toBe(true);
  });

  it('is hidden when there is no update', () => {
    expect(isBadgeVisible(null, null)).toBe(false);
  });

  it('is hidden when the available version was skipped', () => {
    expect(isBadgeVisible('0.1.5', '0.1.5')).toBe(false);
  });

  it('reappears for a version newer than the skipped one', () => {
    expect(isBadgeVisible('0.1.6', '0.1.5')).toBe(true);
  });
});

describe('updateStore.skipThisVersion', () => {
  it('persists the skipped version and closes the modal', () => {
    useUpdateStore.setState({ availableVersion: '0.1.5', modalOpen: true });
    useUpdateStore.getState().skipThisVersion();
    const s = useUpdateStore.getState();
    expect(s.skippedVersion).toBe('0.1.5');
    expect(s.modalOpen).toBe(false);
    expect(stored.get('agentmix.skippedUpdateVersion')).toBe('0.1.5');
    expect(isBadgeVisible(s.availableVersion, s.skippedVersion)).toBe(false);
  });
});

describe('updateStore.deferUpdate ("later")', () => {
  it('closes the modal but keeps the badge and persists nothing', () => {
    useUpdateStore.setState({ availableVersion: '0.1.5', modalOpen: true });
    useUpdateStore.getState().deferUpdate();
    const s = useUpdateStore.getState();
    expect(s.modalOpen).toBe(false);
    expect(s.skippedVersion).toBeNull();
    expect(stored.has('agentmix.skippedUpdateVersion')).toBe(false);
    expect(isBadgeVisible(s.availableVersion, s.skippedVersion)).toBe(true);
  });
});

describe('updateStore.setAutoCheck', () => {
  it('persists the switch so the gate survives a restart', () => {
    useUpdateStore.getState().setAutoCheck(false);
    expect(useUpdateStore.getState().autoCheckEnabled).toBe(false);
    expect(stored.get('agentmix.autoCheckUpdates')).toBe('false');
  });
});

describe('updateStore.install', () => {
  it('surfaces an install failure instead of failing silently', async () => {
    mockInstall.mockRejectedValue(new Error('signature verification failed'));
    await useUpdateStore.getState().install();
    const s = useUpdateStore.getState();
    expect(s.installing).toBe(false);
    expect(s.installError).toContain('signature verification failed');
  });

  it('tracks download progress events', () => {
    useUpdateStore
      .getState()
      .setProgress({ downloadedBytes: 512, totalBytes: 1024 });
    expect(useUpdateStore.getState().progress?.downloadedBytes).toBe(512);
  });
});
