import { test, expect } from './fixtures';
import { enterParentMode, removeMorningTasks } from './helpers';

test.describe('Timed tasks', () => {
  test('the timer starts with the task, warns before the end, then says time is up', async ({ page }) => {
    test.setTimeout(90_000);
    await page.clock.install({ time: new Date('2026-11-09T18:30:00') }); // a Monday
    await page.goto('/');
    await removeMorningTasks(page);

    // The parent gives the snack 10 minutes
    await enterParentMode(page);
    const row = page.getByTestId('task-row').filter({ hasText: 'Prendre son goûter' });
    await row.getByRole('button', { name: 'edit task' }).click();
    await page.getByTestId('task-duration-input').last().fill('10');
    await page.getByRole('button', { name: 'save task' }).click();
    await expect(page.getByTestId('task-row').filter({ hasText: 'Prendre son goûter' }).getByTestId('task-duration-label')).toHaveText('⏳ 10 min');
    await page.getByRole('button', { name: 'Quitter le Mode Parent' }).click();

    await page.getByTestId('child-card-leo').click();
    const snack = page.locator('main').getByRole('button').filter({ hasText: 'Prendre son goûter' });
    await expect(snack.getByTestId('task-duration')).toContainText('10 min');
    await snack.click();
    const timer = page.locator('[data-column="doing"]').getByTestId('task-timer');
    await expect(timer).toHaveAttribute('data-minutes', '10');

    // 5 minutes left: one warning
    await page.clock.runFor('05:30');
    await expect(timer).toHaveAttribute('data-minutes', '5');
    const banner = page.getByTestId('reminder-banner');
    await expect(banner.getByTestId('reminder-warning')).toContainText('plus que 5 min', { timeout: 15_000 });

    // Time is up
    await page.clock.runFor('05:00');
    await expect(timer).toHaveAttribute('data-expired', 'true');
    await expect(banner.getByTestId('reminder-timeup')).toBeVisible({ timeout: 20_000 });
  });
});

test.describe('Holidays and rest days', () => {
  test('a rest day and holidays hide school tasks and are shown to the children', async ({ page }) => {
    await page.clock.setFixedTime(new Date('2026-11-09T16:00:00')); // a Monday
    await page.goto('/');
    await removeMorningTasks(page);

    await enterParentMode(page);
    const calendar = page.getByTestId('calendar-panel');
    await calendar.getByTestId('rest-today').click();
    await expect(calendar.getByTestId('rest-today')).toHaveAttribute('aria-pressed', 'true');
    await expect(calendar.getByTestId('period-row')).toHaveCount(1);
    // Rest day for everyone today; then holidays for Emma only (adds to it)
    await calendar.getByTestId('rest-today').click();
    await expect(calendar.getByTestId('period-row')).toHaveCount(0);
    await calendar.getByTestId('open-period-form').click();
    const form = calendar.getByTestId('period-form');
    await form.getByRole('button', { name: /Emma/ }).click();
    await form.getByTestId('save-period').click();
    await expect(calendar.getByTestId('period-row')).toHaveCount(1);
    await expect(calendar.getByTestId('period-row')).toHaveAttribute('data-kind', 'holidays');
    await expect(calendar.getByTestId('period-row')).toContainText('Emma');
    await page.getByRole('button', { name: 'Quitter le Mode Parent' }).click();

    await expect(page.getByTestId('child-card-emma').getByTestId('home-period')).toHaveAttribute('data-period', 'holidays');
    await expect(page.getByTestId('child-card-leo').getByTestId('home-period')).toHaveCount(0);

    // Emma: no school bag in holidays; Léo still has it
    await page.getByTestId('child-card-emma').click();
    await expect(page.getByTestId('board-day-kind')).toHaveAttribute('data-kind', 'holidays');
    await expect(page.locator('main')).not.toContainText('Vider son cartable');
    await expect(page.locator('main')).toContainText('Prendre son goûter');
    await page.locator('header').getByRole('button').first().click();
    await page.getByTestId('child-card-leo').click();
    await expect(page.getByTestId('board-day-kind')).toHaveCount(0);
    await expect(page.locator('main')).toContainText('Vider son cartable');
  });
});
