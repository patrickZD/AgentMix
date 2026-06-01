import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import path from 'node:path';
import os from 'node:os';

// WebdriverIO + tauri-driver e2e for the v0.1 UI flow (Windows). See README.md
// for prerequisites. The native folder picker cannot be driven by WebDriver, so
// specs queue paths through the VITE_E2E `__agentmixE2E` hook (backed by the
// `e2e`-feature `e2e_set_next_pick` command) instead of clicking the OS dialog.

const projectRoot = path.resolve(import.meta.dirname, '..');
// Built via `tauri build --debug` (see onPrepare): a debug-profile binary that
// still loads the embedded frontendDist in production mode, output in target/debug.
const application = path.resolve(projectRoot, 'src-tauri', 'target', 'debug', 'agentmix.exe');
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
    // Build via the Tauri CLI (not raw cargo): it runs beforeBuildCommand
    // (pnpm build) so the embedded frontendDist is fresh, and the binary loads
    // it in production mode instead of the dev-server URL. --debug keeps it a
    // fast debug-profile build; --no-bundle skips installers; --features e2e
    // enables the test command; VITE_E2E embeds the folder-pick test hook.
    spawnSync('pnpm', ['tauri', 'build', '--debug', '--no-bundle', '--features', 'e2e'], {
      cwd: projectRoot,
      env: { ...process.env, VITE_E2E: '1' },
      stdio: 'inherit',
      shell: true,
    });
  },

  // tauri-driver proxies to the platform WebDriver (msedgedriver on Windows).
  beforeSession: () => {
    tauriDriver = spawn(tauriDriverBin, [], { stdio: [null, process.stdout, process.stderr] });
  },
  afterSession: () => {
    tauriDriver?.kill();
  },
};
