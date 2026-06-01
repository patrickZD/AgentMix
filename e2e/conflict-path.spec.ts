import { browser, $ } from '@wdio/globals';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { writeSkill, queuePick } from './helpers';

// Conflict path: two repos each ship a `code-review` skill. Selecting both
// raises a NameCollision; renaming one resolves it. Assertions check that both
// directories exist and the renamed skill's frontmatter `name:` is synced.
describe('conflict path', () => {
  it('resolves a name collision by renaming and exports both skills', async () => {
    const base = fs.mkdtempSync(path.join(os.tmpdir(), 'agentmix-e2e-conflict-'));
    const repoA = path.join(base, 'repo-a');
    const repoB = path.join(base, 'repo-b');
    fs.mkdirSync(repoA);
    fs.mkdirSync(repoB);
    writeSkill(repoA, 'code-review');
    writeSkill(repoB, 'code-review');
    const target = path.join(base, 'target');
    fs.mkdirSync(target);

    // Add the first repo via the welcome entry, the second via the panel "+".
    await queuePick(repoA);
    await $('[data-testid="welcome-add-project"]').click();
    await $('[data-project="repo-a"]').waitForExist({ timeout: 20000 });
    await queuePick(repoB);
    await $('[data-testid="add-project"]').click();
    await $('[data-project="repo-b"]').waitForExist({ timeout: 20000 });

    // Add both same-named skills -> collision.
    for (const project of ['repo-a', 'repo-b']) {
      const add = $(`[data-project="${project}"] [data-testid="skill-add"]`);
      await add.moveTo();
      await add.click();
    }

    // Resolve by renaming the first conflicting combo entry.
    const rename = $('[data-testid="combo-rename"]');
    await rename.waitForDisplayed({ timeout: 20000 });
    await rename.click();
    await $('[data-testid="combo-rename-input"]').setValue('code-review-b');
    await $('[data-testid="combo-rename-confirm"]').click();

    // Export to the target project.
    await queuePick(target);
    await $('[data-testid="export-target"]').click();
    await $('[data-testid="export-preview"]').click();
    const exportBtn = $('[data-testid="export-run"]');
    await exportBtn.waitForEnabled({ timeout: 20000 });
    await exportBtn.click();

    // Both skills coexist; the renamed one's frontmatter `name:` is synced.
    const skillsDir = path.join(target, '.claude', 'skills');
    await browser.waitUntil(
      () => fs.existsSync(path.join(skillsDir, 'code-review-b', 'SKILL.md')),
      { timeout: 20000, timeoutMsg: 'rename export did not complete' },
    );
    if (!fs.existsSync(path.join(skillsDir, 'code-review', 'SKILL.md'))) {
      throw new Error('the original code-review skill was not exported');
    }
    const renamed = fs.readFileSync(path.join(skillsDir, 'code-review-b', 'SKILL.md'), 'utf8');
    const nameLine = renamed.split('\n').find((l) => l.trimStart().startsWith('name:'));
    if (nameLine?.trim() !== 'name: code-review-b') {
      throw new Error(`frontmatter name not synced to the export name: ${nameLine}`);
    }
  });
});
