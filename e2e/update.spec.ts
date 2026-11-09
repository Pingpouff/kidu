import { test, expect } from './fixtures';
import { enterParentMode } from './helpers';
import pkg from '../package.json' with { type: 'json' };

/** Version stored by the app at its last launch (null: from before versions were tracked) */
const setLastSeen = (v: string | null) => {
  if (v === null) localStorage.removeItem('kidu.lastSeenVersion');
  else localStorage.setItem('kidu.lastSeenVersion', v);
};

test.describe('Version and "What\'s new"', () => {
  test('a fresh install shows nothing; after an update, "What\'s new" shows once', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('child-card-leo')).toBeVisible();
    const whatsNew = page.getByTestId('whats-new');
    await expect(whatsNew).toHaveCount(0);

    // The app was on an older version
    await page.evaluate(setLastSeen, '1.0.0');
    await page.reload();
    await expect(whatsNew).toBeVisible();
    await expect(whatsNew).toContainText('Quoi de neuf ?');
    await expect(whatsNew).toContainText(`Version ${pkg.version}`);
    await expect(whatsNew).not.toContainText('Version 1.0.0');
    await whatsNew.getByRole('button', { name: 'Super !' }).click();
    await expect(whatsNew).toHaveCount(0);

    await page.reload();
    await expect(page.getByTestId('child-card-leo')).toBeVisible();
    await expect(whatsNew).toHaveCount(0);
  });

  test('an install from before versions were tracked gets the news too', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('child-card-leo')).toBeVisible();
    await page.evaluate(setLastSeen, null);
    await page.reload();
    await expect(page.getByTestId('whats-new')).toContainText(`Version ${pkg.version}`);
  });

  test('Settings show the version and the version history', async ({ page }) => {
    await page.goto('/');
    await enterParentMode(page);
    await page.getByRole('button', { name: 'Paramètres', exact: true }).click();
    const app = page.getByTestId('app-version');
    await expect(app).toContainText(pkg.version);
    await app.getByRole('button', { name: 'Historique des versions' }).click();
    const history = page.getByTestId('whats-new');
    await expect(history).toContainText('Historique des versions');
    await expect(history).toContainText('Version 1.0.0');
  });
});
