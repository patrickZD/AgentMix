import { getVersion } from '@tauri-apps/api/app';

// Build-time fallback for the version label. Vite's `define` replaces
// __APP_VERSION__ with the package.json version in dev/build; the `typeof`
// guard keeps this from throwing in unit tests (Vitest does not apply the
// define), where the value is irrelevant. It seeds the label synchronously so
// the first render shows the right version instead of a blank, before
// readAppVersion() refines it from the runtime.
export const APP_VERSION: string =
  typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.0.0-dev';

// The running app's version. Inside Tauri this is the actual installed version
// (tauri.conf.json); anywhere else it degrades to the build-time fallback.
export async function readAppVersion(): Promise<string> {
  try {
    return await getVersion();
  } catch {
    return APP_VERSION;
  }
}
