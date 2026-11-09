import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';

const openParentSettings = async (page: Page) => {
  await page.locator('button[aria-label="Mode Parent"]').click();
  for (const digit of ['1', '2', '3', '4']) {
    await page.getByRole('button', { name: digit, exact: true }).click();
  }
  await expect(page.locator('h1')).toContainText(/Tableau de bord/i);
  await page.getByRole('button', { name: 'Paramètres' }).click();
};

test.describe('Configuration backup', () => {
  test('exports the configuration and restores it after a change', async ({ page }) => {
    await page.goto('/');
    await openParentSettings(page);

    // 1. Export the current configuration
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Exporter' }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/^kidu-backup-\d{4}-\d{2}-\d{2}\.json$/);

    const exported = JSON.parse(await readFile(await download.path(), 'utf-8'));
    expect(exported.app).toBe('kidu');
    expect(exported.data.profiles.map((p: { name: string }) => p.name)).toContain('Léo');
    expect(exported.data).not.toHaveProperty('history');

    // 2. Change the configuration: delete every task
    await page.getByRole('button', { name: 'Routine & Tâches' }).click();
    await expect(page.locator('body')).toContainText('Se brosser les dents');
    const deleteButtons = page.locator('button[aria-label="delete task"]');
    const count = await deleteButtons.count();
    expect(count).toBeGreaterThan(0);
    for (let remaining = count; remaining > 0; remaining--) {
      await deleteButtons.first().click();
      await expect(deleteButtons).toHaveCount(remaining - 1);
    }
    await expect(page.locator('body')).not.toContainText('Se brosser les dents');

    // 3. Import the exported file and confirm
    await page.getByRole('button', { name: 'Paramètres' }).click();
    await page.getByTestId('backup-file-input').setInputFiles({
      name: 'backup.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(exported)),
    });
    await page.getByRole('button', { name: 'Remplacer la configuration' }).click();
    await expect(page.getByRole('status')).toContainText('Configuration importée');

    // 4. After the automatic reload, the tasks are back
    await page.waitForLoadState('load');
    await openParentSettings(page);
    await page.getByRole('button', { name: 'Routine & Tâches' }).click();
    await expect(page.locator('body')).toContainText('Se brosser les dents');
  });

  test('rejects a file that is not a Kidu backup', async ({ page }) => {
    await page.goto('/');
    await openParentSettings(page);

    await page.getByTestId('backup-file-input').setInputFiles({
      name: 'random.json',
      mimeType: 'application/json',
      buffer: Buffer.from('{"hello": "world"}'),
    });

    await expect(page.getByRole('alert')).toContainText('pas une sauvegarde Kidu valide');
    await expect(page.getByRole('button', { name: 'Remplacer la configuration' })).toHaveCount(0);
  });
});
