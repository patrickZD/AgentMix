import { browser } from '@wdio/globals';
import fs from 'node:fs';
import path from 'node:path';

/** Write a minimal valid skill (name matches its directory) under root/name. */
export function writeSkill(root: string, name: string): void {
  const dir = path.join(root, name);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, 'SKILL.md'),
    `---\nname: ${name}\ndescription: Use when ${name}.\n---\n# ${name}\n`,
  );
}

/** Queue the path the next native folder pick should return (the e2e hook). */
export async function queuePick(dir: string): Promise<void> {
  // The hook is installed by the app bundle on load; wait until it is on window.
  const ready = await browser
    .waitUntil(
      () =>
        browser.execute(() =>
          Boolean((window as unknown as { __agentmixE2E?: unknown }).__agentmixE2E),
        ),
      { timeout: 15000, timeoutMsg: '__agentmixE2E hook not ready' },
    )
    .then(() => true)
    .catch(() => false);
  if (!ready) {
    const diag = await browser.execute(() => ({
      url: location.href,
      title: document.title,
      readyState: document.readyState,
      hasTauriInternals: Boolean(
        (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__,
      ),
      hasGlobalTauri: Boolean((window as unknown as Record<string, unknown>).__TAURI__),
      rootChildren: document.getElementById('root')?.childElementCount ?? -1,
      bodyLen: document.body ? document.body.innerHTML.length : -1,
    }));
    throw new Error('hook not ready; page diag: ' + JSON.stringify(diag));
  }
  await browser.execute((p) => {
    (
      window as unknown as { __agentmixE2E: { setNextPick: (p: string) => void } }
    ).__agentmixE2E.setNextPick(p);
  }, dir);
}
