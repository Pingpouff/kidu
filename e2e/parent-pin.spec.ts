import { test, expect, type Page } from '@playwright/test';
import { enterParentMode } from './helpers';

const openPinPad = async (page: Page) => {
  await page.goto('/');
  await page.locator('button[aria-label="Mode Parent"]').click();
  const pad = page.getByTestId('pin-pad');
  await expect(pad).toBeVisible();
  return pad;
};

const typeDigits = async (page: Page, digits: string) => {
  for (const d of digits) await page.getByTestId('pin-pad').getByRole('button', { name: d, exact: true }).click();
};

test.describe('Parent Mode access', () => {
  test('holding the pad no longer opens Parent Mode, and the screen no longer suggests it', async ({ page }) => {
    const pad = await openPinPad(page);
    await expect(pad).not.toContainText('3 secondes');
    const lock = pad.locator('svg.lucide-lock');
    await lock.hover();
    await page.mouse.down();
    await page.waitForTimeout(3500);
    await page.mouse.up();
    await expect(page.locator('h1')).not.toContainText(/Tableau de bord/i);
    await expect(pad).toBeVisible();
  });

  test('"Forgot the PIN?" opens Parent Mode with a grown-up question', async ({ page }) => {
    const pad = await openPinPad(page);
    await pad.getByRole('button', { name: 'Code oublié ?' }).click();
    const challenge = page.getByTestId('pin-challenge');

    // A wrong answer gives another question
    await challenge.getByRole('textbox').fill('1');
    await challenge.getByRole('button', { name: 'Valider' }).click();
    await expect(pad).toContainText('Mauvaise réponse');
    await expect(page.locator('h1')).not.toContainText(/Tableau de bord/i);

    const [, a2, b2] = (await challenge.innerText()).match(/(\d+)\s*×\s*(\d+)/)!;
    expect(Number(a2) * Number(b2)).toBeGreaterThan(0);
    await challenge.getByRole('textbox').fill(String(Number(a2) * Number(b2)));
    await challenge.getByRole('button', { name: 'Valider' }).click();
    await expect(page.locator('h1')).toContainText(/Tableau de bord/i);
  });

  test('3 wrong PINs lock the pad for a while', async ({ page }) => {
    const pad = await openPinPad(page);
    for (let i = 0; i < 3; i++) {
      await typeDigits(page, '9999');
      await expect(pad.getByRole('alert')).toBeVisible();
    }
    await expect(page.getByTestId('pin-locked')).toContainText(/Réessaie dans \d+ s/);
    await expect(pad.getByRole('button', { name: '1', exact: true })).toBeDisabled();
    // Closing and reopening doesn't lift the lock
    await pad.getByRole('button', { name: 'Fermer' }).click();
    await page.locator('button[aria-label="Mode Parent"]').click();
    await expect(page.getByTestId('pin-locked')).toBeVisible();
  });

  test('a warning asks to change the default PIN; the PIN field is hidden', async ({ page }) => {
    await page.goto('/');
    await enterParentMode(page);
    const warning = page.getByTestId('default-pin-warning');
    await expect(warning).toBeVisible();
    await warning.getByRole('button', { name: 'Changer le code' }).click();

    const pinField = page.getByLabel('Code PIN Parent');
    await expect(pinField).toHaveAttribute('type', 'password');
    await pinField.fill('4321');
    await page.getByRole('button', { name: 'Sauvegarder', exact: false }).first().click();
    await expect(page.getByText('Paramètres sauvegardés !')).toBeVisible();
    await page.getByRole('button', { name: 'Routine & Tâches', exact: true }).click();
    await expect(warning).toHaveCount(0);
  });
});
