import { test, expect } from './fixtures';
import type { Page } from '@playwright/test';
import pkg from '../package.json' with { type: 'json' };

const fireInstallEvent = (page: Page) =>
  page.evaluate(() =>
    window.dispatchEvent(
      Object.assign(new Event('beforeinstallprompt', { cancelable: true }), {
        prompt: () => Promise.resolve(),
        userChoice: Promise.resolve({ outcome: 'dismissed' }),
      })
    )
  );

test.describe('About and install', () => {
  test('"About" shows the version and the version history, without the PIN', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('about-button').click();
    const about = page.getByTestId('about');
    await expect(about.getByTestId('about-version')).toHaveText(`Version ${pkg.version}`);
    await expect(about.getByTestId('about-changelog')).toContainText(`Version ${pkg.version}`);
    await expect(about.getByTestId('about-changelog')).toContainText('Version 1.0.0');
    await about.getByRole('button', { name: 'Fermer' }).click();
    await expect(about).toHaveCount(0);
  });

  test('when the browser allows it, the home screen invites to install the app', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('child-card-leo')).toBeVisible();
    await expect(page.getByTestId('install-banner')).toHaveCount(0);

    // Headless Chromium never fires it: simulate the browser's install event
    await page.evaluate(() => {
      const event = Object.assign(new Event('beforeinstallprompt', { cancelable: true }), {
        prompt: () => {
          (window as unknown as { promptShown: boolean }).promptShown = true;
          return Promise.resolve();
        },
        userChoice: Promise.resolve({ outcome: 'accepted' }),
      });
      window.dispatchEvent(event);
    });
    const banner = page.getByTestId('install-banner');
    await expect(banner).toContainText('Installe Kidu');
    await banner.getByRole('button', { name: "Installer l'app" }).click();
    await expect.poll(() => page.evaluate(() => (window as unknown as { promptShown?: boolean }).promptShown)).toBe(true);
    await expect(banner).toHaveCount(0);

    await page.getByTestId('about-button').click();
    await expect(page.getByTestId('about')).toContainText('Installée sur cet appareil');
  });

  test('"Not now" hides the invitation', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('child-card-leo')).toBeVisible();
    await fireInstallEvent(page);
    await page.getByTestId('install-banner').getByRole('button', { name: 'Plus tard' }).click();
    await expect(page.getByTestId('install-banner')).toHaveCount(0);
    // Still hidden after a reload, even when the browser offers the install again
    await page.reload();
    await expect(page.getByTestId('child-card-leo')).toBeVisible();
    await fireInstallEvent(page);
    await page.waitForTimeout(300);
    await expect(page.getByTestId('install-banner')).toHaveCount(0);
  });
});
