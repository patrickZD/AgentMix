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
  await browser.execute((p) => {
    (
      window as unknown as { __agentmixE2E: { setNextPick: (p: string) => void } }
    ).__agentmixE2E.setNextPick(p);
  }, dir);
}
