import { test, expect, type Page } from '@playwright/test';
import { completeTask, enterParentMode } from './helpers';

// "00:00" is always in the past during the day: the tasks are immediately late
const setDueTime = async (page: Page, taskLabel: string, time: string) => {
  const row = page.locator('[data-testid^="task-group-"] > div > div').filter({ hasText: taskLabel }).first();
  await row.getByRole('button', { name: 'edit task' }).click();
  await page.getByLabel('Heure limite').last().fill(time);
  await page.getByRole('button', { name: 'save task' }).click();
  await expect(page.getByTestId('task-group-after_school')).toContainText(`⏰ ${time}`);
};

test.describe('Reminders for late tasks', () => {
  test('announces late tasks one child at a time and clears them once done', async ({ page }) => {
    test.setTimeout(60_000);
    await page.goto('/');
    await enterParentMode(page);
    await setDueTime(page, 'Vider son cartable', '00:00');
    await setDueTime(page, 'Prendre son goûter', '00:00');

    // No reminder while in Parent Mode
    await expect(page.getByTestId('reminder-banner')).toHaveCount(0);
    await page.getByRole('button', { name: 'Quitter le Mode Parent' }).click();

    // Both children are late on 2 tasks: badges on the profile cards
    await expect(page.getByTestId('profile-late')).toHaveCount(2);
    await expect(page.getByTestId('profile-late').first()).toContainText('2');

    // First announcement: one child, with both late tasks grouped, in routine order
    const banner = page.getByTestId('reminder-banner');
    await expect(banner).toBeVisible();
    await expect(banner).toContainText(/Vider son cartable.*Prendre son goûter/);
    const firstChild = (await banner.textContent())!.includes('Léo') ? 'Léo' : 'Emma';
    const secondChild = firstChild === 'Léo' ? 'Emma' : 'Léo';

    // Then the other child, once the first announcement is over (never both at once)
    await expect(banner).toContainText(secondChild, { timeout: 20_000 });
    await expect(banner).toHaveCount(1);
    await expect(banner).not.toContainText(firstChild);

    // Léo does his tasks: his late markers disappear
    await page.getByRole('button').filter({ hasText: 'Léo' }).first().click();
    await expect(page.getByTestId('task-late')).toHaveCount(2);
    await completeTask(page, 'Vider son cartable');
    await completeTask(page, 'Prendre son goûter');
    await expect(page.getByTestId('task-late')).toHaveCount(0);

    await page.locator('header').getByRole('button').first().click(); // back to profiles
    await expect(page.getByTestId('profile-late')).toHaveCount(1);
  });

  test('reminders can be turned off', async ({ page }) => {
    await page.goto('/');
    await enterParentMode(page);
    await setDueTime(page, 'Vider son cartable', '00:00');
    await page.getByRole('button', { name: 'Paramètres' }).click();
    await page.getByLabel('Activer les rappels').uncheck();
    await page.getByRole('button', { name: 'Sauvegarder' }).click();
    await page.getByRole('button', { name: 'Quitter le Mode Parent' }).click();

    // Late tasks are still flagged, but nothing is announced
    await expect(page.getByTestId('profile-late')).toHaveCount(2);
    await page.waitForTimeout(1500);
    await expect(page.getByTestId('reminder-banner')).toHaveCount(0);
  });
});
