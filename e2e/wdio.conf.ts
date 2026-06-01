import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import path from 'node:path';
import os from 'node:os';

// WebdriverIO + tauri-driver e2e for the v0.1 UI flow (Windows). See README.md
// for prerequisites. The native folder picker cannot be driven by WebDriver, so
// specs queue paths through the VITE_E2E `__agentmixE2E` hook (backed by the
// `e2e`-feature `e2e_set_next_pick` command) instead of clicking the OS dialog.

const projectRoot = path.resolve(import.meta.dirname, '..');
// Release binary: a debug build loads devUrl (localhost:5173), but the e2e app
// is served from the embedded frontendDist, which only a non-dev build uses.
const application = path.resolve(projectRoot, 'src-tauri', 'target', 'release', 'agentmix.exe');
const tauriDriverBin = path.resolve(os.homedir(), '.cargo', 'bin', 'tauri-driver.exe');

let tauriDriver: ChildProcess | undefined;

export const config: WebdriverIO.Config = {
  runner: 'local',
  // Connect to tauri-driver (it proxies to msedgedriver), not a local browser.
  hostname: '127.0.0.1',
  port: 4444,
  specs: ['./*.spec.ts'],
  maxInstances: 1,
  capabilities: [
    // 'tauri:options' is a tauri-driver capability, not in the standard type.
    { 'tauri:options': { application } } as unknown as WebdriverIO.Capabilities,
  ],
  logLevel: 'warn',
  reporters: ['spec'],
  framework: 'mocha',
  mochaOpts: { ui: 'bdd', timeout: 120000 },

  // Build the e2e binary once: the frontend with the test hook embedded
  // (VITE_E2E), then the Rust binary with the `e2e` cargo feature.
  onPrepare: () => {
    spawnSync('pnpm', ['build'], {
      cwd: projectRoot,
      env: { ...process.env, VITE_E2E: '1' },
      stdio: 'inherit',
      shell: true,
    });
    // Release (not debug) so the binary loads the embedded frontendDist rather
    // than the dev-server URL. NOTE: Tauri embeds the frontend at compile time;
    // after changing the frontend, force a re-embed with
    //   cargo clean -p agentmix --release
    // (a dist-only change does not reliably retrigger the build).
    spawnSync(
      'cargo',
      ['build', '--release', '--features', 'e2e', '--manifest-path', 'src-tauri/Cargo.toml'],
      { cwd: projectRoot, stdio: 'inherit', shell: true },
    );
  },

  // tauri-driver proxies to the platform WebDriver (msedgedriver on Windows).
  beforeSession: () => {
    tauriDriver = spawn(tauriDriverBin, [], { stdio: [null, process.stdout, process.stderr] });
  },
  afterSession: () => {
    tauriDriver?.kill();
  },
};
