import { test, expect } from './fixtures';
import type { Page } from '@playwright/test';
import { completeTask, dismissRewards, keepOnlyTasks } from './helpers';

const typePin = async (page: Page) => {
  for (const d of '1234') await page.getByTestId('pin-pad').getByRole('button', { name: d, exact: true }).click();
};

test.describe('Day logic', () => {
  test('a parent skips the morning step with the PIN, then resumes it', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('child-card-leo').click();
    const indicator = page.getByTestId('phase-indicator');
    await expect(indicator).toContainText('Matin');

    await page.getByTestId('skip-phase').click();
    await expect(page.getByTestId('pin-pad')).toContainText("Passer l'étape Matin ?");
    await typePin(page);

    await expect(indicator).toContainText("Après l'école");
    await expect(page.getByTestId('phase-dot').first()).toHaveAttribute('data-state', 'skipped');
    await expect(page.locator('main')).toContainText('Vider son cartable');
    await expect(page.locator('main')).not.toContainText('Prendre son petit-déjeuner');

    // The selection screen follows
    await page.locator('header').getByRole('button').first().click();
    await expect(page.getByTestId('child-card-leo').getByTestId('home-progress')).toContainText("Après l'école");
    await page.getByTestId('child-card-leo').click();

    await page.getByTestId('resume-phase').click();
    await typePin(page);
    await expect(indicator).toContainText('Matin');
    await expect(page.locator('main')).toContainText('Prendre son petit-déjeuner');
  });

  test('a day with a skipped step still counts once the rest is done', async ({ page }) => {
    await page.goto('/');
    await keepOnlyTasks(page, ['breakfast', 'lights_off']);
    await page.getByTestId('child-card-leo').click();

    await page.getByTestId('skip-phase').click();
    await typePin(page);
    await completeTask(page, 'Éteindre la lumière', { dismiss: false });

    // Day completed (the celebration opens); after a reload, the home screen shows it done
    await expect(page.getByText('Tu as terminé toute ta journée', { exact: false })).toBeVisible();
    await page.goto('/');
    await dismissRewards(page);
    await expect(page.getByTestId('child-card-leo').getByTestId('home-progress')).toContainText('Routine finie');
  });

  test('school tasks are not planned on Saturday', async ({ page }) => {
    await page.clock.setFixedTime(new Date('2026-11-14T16:00:00'));
    await page.goto('/');
    await page.getByTestId('child-card-leo').click();
    await page.getByTestId('skip-phase').click();
    await typePin(page);
    const main = page.locator('main');
    await expect(main).toContainText('Prendre son goûter');
    await expect(main).not.toContainText('Vider son cartable');
    await expect(main).not.toContainText('Faire ses devoirs');
  });
});
