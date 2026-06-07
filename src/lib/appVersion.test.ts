import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@tauri-apps/api/app', () => ({ getVersion: vi.fn() }));
import { getVersion } from '@tauri-apps/api/app';
import { APP_VERSION, readAppVersion } from './appVersion';

const mockGetVersion = vi.mocked(getVersion);

afterEach(() => mockGetVersion.mockReset());

describe('readAppVersion', () => {
  it('prefers the running app version reported by the Tauri runtime', async () => {
    mockGetVersion.mockResolvedValue('9.9.9');
    expect(await readAppVersion()).toBe('9.9.9');
  });

  it('falls back to the build-time version outside the Tauri webview', async () => {
    mockGetVersion.mockRejectedValue(new Error('not in a tauri context'));
    const version = await readAppVersion();
    // The fallback is the package.json version injected at build time. Assert it
    // is a real semver string (not empty/undefined) so a wiring regression that
    // blanks the version label is caught — without pinning the literal version,
    // which would itself drift on the next bump.
    expect(version).toMatch(/^\d+\.\d+\.\d+/);
    expect(version).toBe(APP_VERSION);
  });
});
