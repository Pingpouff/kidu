import { test, expect } from './fixtures';
import type { Page } from '@playwright/test';
import { enterParentMode } from './helpers';

/** Pretends the device has this much memory (navigator.deviceMemory, in GB) */
const fakeMemory = (page: Page, gb: number) =>
  page.addInitScript((value) => Object.defineProperty(Navigator.prototype, 'deviceMemory', { get: () => value }), gb);

const html = (page: Page) => page.locator('html');

/** Computed style of the first element matching `selector` */
const style = (page: Page, selector: string, property: string) =>
  page.locator(selector).first().evaluate((el, prop) => getComputedStyle(el).getPropertyValue(prop), property);

const chooseDisplay = async (page: Page, value: 'auto' | 'rich' | 'lite') => {
  await enterParentMode(page);
  await page.getByRole('button', { name: 'Paramètres', exact: true }).click();
  await page.getByTestId('settings-visuals').selectOption(value);
  await page.getByRole('button', { name: 'Sauvegarder' }).click();
};

test.describe('Lite display', () => {
  test('a weak device gets the lite display automatically: no blur, no looping animations', async ({ page }) => {
    await fakeMemory(page, 1);
    await page.goto('/');
    await expect(page.getByTestId('home-tonight')).toBeVisible();
    await expect(html(page)).toHaveClass(/\blite\b/);

    expect(await style(page, '.glass-panel', 'backdrop-filter')).toBe('none');
    expect(await style(page, '[data-testid="home-screen"] .animate-pulse', 'animation-name')).toBe('none');

    // Settings say what was detected
    await enterParentMode(page);
    await page.getByRole('button', { name: 'Paramètres', exact: true }).click();
    await expect(page.getByTestId('settings-visuals')).toContainText('Automatique (allégé sur cet appareil)');
  });

  test('a regular device keeps the full display', async ({ page }) => {
    await fakeMemory(page, 8);
    await page.goto('/');
    await expect(page.getByTestId('home-tonight')).toBeVisible();
    await expect(html(page)).not.toHaveClass(/\blite\b/);
    expect(await style(page, '.glass-panel', 'backdrop-filter')).not.toBe('none');
    expect(await style(page, '[data-testid="home-screen"] .animate-pulse', 'animation-name')).not.toBe('none');
  });

  test("the parent's choice wins over detection, and is kept after a reload", async ({ page }) => {
    await fakeMemory(page, 8);
    await page.goto('/');
    await chooseDisplay(page, 'lite');
    await expect(html(page)).toHaveClass(/\blite\b/);
    await page.reload();
    await expect(html(page)).toHaveClass(/\blite\b/);

    await chooseDisplay(page, 'rich');
    await expect(html(page)).not.toHaveClass(/\blite\b/);
  });
});
