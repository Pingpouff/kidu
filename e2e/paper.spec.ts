import { test, expect } from './fixtures';
import type { Page } from '@playwright/test';
import { enterParentMode, openParentTab } from './helpers';

const html = (page: Page) => page.locator('html');

/** Computed style of the first element matching `selector` */
const style = (page: Page, selector: string, property: string) =>
  page.locator(selector).first().evaluate((el, prop) => getComputedStyle(el).getPropertyValue(prop), property);

/** Brightness 0..255 of a computed `rgb(…)` color */
const brightness = (color: string) => {
  const [r, g, b] = color.match(/\d+(\.\d+)?/g)!.map(Number);
  return (r + g + b) / 3;
};

const chooseStyle = async (page: Page, value: 'glass' | 'paper') => {
  await enterParentMode(page);
  await openParentTab(page, 'Paramètres');
  await page.getByTestId('settings-style').selectOption(value);
  await page.getByRole('button', { name: 'Sauvegarder' }).click();
  await page.getByRole('button', { name: 'Quitter le Mode Parent' }).first().click();
  await expect(page.getByTestId('home-screen')).toBeVisible();
};

test.describe('Paper style', () => {
  test('the default style stays dark glass', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('home-tonight')).toBeVisible();
    await expect(html(page)).not.toHaveClass(/\bpaper\b/);
    expect(brightness(await style(page, 'body', 'background-color'))).toBeLessThan(40);
  });

  test('a parent switches to paper: light page, ink text, no blur; kept after a reload, then back', async ({ page }) => {
    await page.goto('/');
    await chooseStyle(page, 'paper');
    await expect(html(page)).toHaveClass(/\bpaper\b/);

    expect(brightness(await style(page, 'body', 'background-color'))).toBeGreaterThan(220);
    expect(brightness(await style(page, 'body', 'color'))).toBeLessThan(80);
    expect(await style(page, '.glass-panel', 'backdrop-filter')).toBe('none');
    // Android status bar follows the paper
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#f8f4eb');

    // On a board: task labels in ink on a light card
    await page.getByTestId('child-card-leo').click();
    const card = page.locator('[data-column="todo"] [role="button"]').first();
    expect(brightness(await card.evaluate((el) => getComputedStyle(el).color))).toBeLessThan(80);
    await page.getByRole('button', { name: /Retour|Back/ }).first().click();

    // Remembered before the database loads: no dark first frame
    await page.reload();
    await expect(html(page)).toHaveClass(/\bpaper\b/);
    expect(await page.evaluate(() => localStorage.getItem('kidu.style'))).toBe('paper');

    await chooseStyle(page, 'glass');
    await expect(html(page)).not.toHaveClass(/\bpaper\b/);
    expect(brightness(await style(page, 'body', 'background-color'))).toBeLessThan(40);
  });

  test('the treasure keeps its night look in paper', async ({ page }) => {
    await page.goto('/');
    await chooseStyle(page, 'paper');
    await page.getByTestId('child-card-leo').click();
    await page.getByTestId('piggy-header-count').click();
    await page.getByTestId('open-treasure').click();
    const sparkle = page.locator('.treasure-sparkle').first();
    expect(brightness(await sparkle.evaluate((el) => getComputedStyle(el).color))).toBeGreaterThan(200);
  });
});
