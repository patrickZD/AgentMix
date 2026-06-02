import { browser, $, $$ } from '@wdio/globals';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { writeSkill, queuePick } from './helpers';

// Golden path: scan a folder via the button entry, add three skills, Dry-run
// preview, export. Assertions check the real filesystem result, not UI text.
describe('golden path', () => {
  it('scans a folder, previews and exports three skills', async () => {
    const base = fs.mkdtempSync(path.join(os.tmpdir(), 'agentmix-e2e-golden-'));
    const source = path.join(base, 'source-repo');
    fs.mkdirSync(source);
    for (const name of ['code-review', 'deploy', 'test-gen']) writeSkill(source, name);
    const target = path.join(base, 'target-project');
    fs.mkdirSync(target);

    // Button entry (welcome screen) -> the queued source folder is scanned.
    await queuePick(source);
    await $('[data-testid="welcome-add-project"]').click();
    await $('[data-testid="skill-add"]').waitForExist({ timeout: 20000 });

    // Add every scanned skill to the combo (re-clicking an added one is a no-op).
    for (const add of await $$('[data-testid="skill-add"]')) {
      await add.moveTo();
      await add.click();
    }

    // Choose the target project, build the Dry-run preview, then export.
    await queuePick(target);
    await $('[data-testid="export-target"]').click();
    await $('[data-testid="export-preview"]').click();
    const exportBtn = $('[data-testid="export-run"]');
    await exportBtn.waitForEnabled({ timeout: 20000 });
    await exportBtn.click();

    // The target now holds three complete skill subdirectories.
    const skillsDir = path.join(target, '.claude', 'skills');
    await browser.waitUntil(() => fs.existsSync(path.join(skillsDir, 'test-gen', 'SKILL.md')), {
      timeout: 20000,
      timeoutMsg: 'export did not write the skills',
    });
    for (const name of ['code-review', 'deploy', 'test-gen']) {
      if (!fs.existsSync(path.join(skillsDir, name, 'SKILL.md'))) {
        throw new Error(`missing exported skill: ${name}`);
      }
    }
  });
});
