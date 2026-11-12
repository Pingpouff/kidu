import { test, expect } from './fixtures';
import type { Page } from '@playwright/test';
import { completeTask, enterParentMode, removeMorningTasks } from './helpers';

// "00:00" is always in the past during the day: the tasks are immediately late
const setDueTime = async (page: Page, taskLabel: string, time: string) => {
  const row = page.locator('[data-testid^="task-group-"] > div > div').filter({ hasText: taskLabel }).first();
  await row.getByRole('button', { name: 'edit task' }).click();
  await page.getByLabel('Heure de fin').last().fill(time);
  await page.getByRole('button', { name: 'save task' }).click();
  await expect(page.getByTestId('task-group-after_school')).toContainText(`⏰ ${time}`);
};

test.describe('Reminders for late tasks', () => {
  test('announces late tasks one child at a time and clears them once done', async ({ page }) => {
    test.setTimeout(60_000);
    await page.goto('/');
    await removeMorningTasks(page);
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
    await page.getByTestId('child-card-leo').click();
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

test.describe('Start and end times', () => {
  test('a task can have a start and an end time, with a "time to start" reminder', async ({ page }) => {
    await page.clock.setFixedTime(new Date('2026-11-09T18:20:00'));
    await page.goto('/');
    await removeMorningTasks(page);
    await enterParentMode(page);

    const row = page.locator('[data-testid="task-row"]').filter({ hasText: 'Vider son cartable' });
    await row.getByRole('button', { name: 'edit task' }).click();

    // Start after end: refused
    await page.getByLabel('Heure de début').last().fill('19:00');
    await page.getByLabel('Heure de fin').last().fill('18:30');
    await expect(page.getByTestId('time-window-error')).toBeVisible();
    await page.getByRole('button', { name: 'save task' }).click();
    await expect(page.getByRole('button', { name: 'save task' })).toBeVisible(); // still editing

    await page.getByLabel('Heure de début').last().fill('18:00');
    await page.getByLabel('Heure de fin').last().fill('19:00');
    await expect(page.getByTestId('time-window-error')).toHaveCount(0);
    await page.getByRole('button', { name: 'save task' }).click();
    await expect(row.getByTestId('task-start-time')).toContainText('18:00');
    await expect(row).toContainText('⏰ 19:00');
    await page.getByRole('button', { name: 'Quitter le Mode Parent' }).click();

    // 18:20: started time passed, not started yet → "time to start" (not late)
    const banner = page.getByTestId('reminder-banner');
    await expect(banner).toBeVisible();
    await expect(banner).toContainText('Vider son cartable');
    await expect(banner.getByTestId('reminder-start')).toContainText('18:00');
    await expect(page.getByTestId('profile-late')).toHaveCount(0);

    // The board shows the time window
    await page.getByTestId('child-card-leo').click();
    const card = page.locator('main').getByRole('button').filter({ hasText: 'Vider son cartable' });
    await expect(card.getByTestId('task-due')).toContainText('18:00–19:00');
  });
});

test.describe('Stopping reminders for tonight', () => {
  test('a parent stops one child from the reminder, then everyone from the home screen, and turns them back on', async ({ page }) => {
    test.setTimeout(60_000);
    await page.goto('/');
    await removeMorningTasks(page);
    await enterParentMode(page);
    await setDueTime(page, 'Vider son cartable', '00:00');
    await page.getByRole('button', { name: 'Quitter le Mode Parent' }).click();
    await expect(page.getByTestId('profile-late')).toHaveCount(2);

    // From the reminder itself: that child only, with the PIN
    const banner = page.getByTestId('reminder-banner');
    await expect(banner).toBeVisible();
    const first = (await banner.textContent())!.includes('Léo') ? 'leo' : 'emma';
    const other = first === 'leo' ? 'emma' : 'leo';
    await banner.getByTestId('reminder-mute').click();
    for (const digit of ['1', '2', '3', '4']) await page.getByRole('button', { name: digit, exact: true }).click();
    await expect(page.getByTestId(`child-card-${first}`).getByTestId('profile-late')).toHaveCount(0);
    await expect(page.getByTestId(`child-card-${first}`).getByTestId('home-child-muted')).toBeVisible();
    await expect(page.getByTestId(`child-card-${other}`).getByTestId('profile-late')).toHaveCount(1);
    await expect(page.getByTestId('home-muted')).toBeVisible();

    // From the home screen: everyone
    await page.getByTestId('mute-reminders').click();
    for (const digit of ['1', '2', '3', '4']) await page.getByRole('button', { name: digit, exact: true }).click();
    await expect(page.getByTestId('profile-late')).toHaveCount(0);
    await expect(page.getByTestId('mute-reminders')).toHaveCount(0);
    await expect(banner).toHaveCount(0, { timeout: 20_000 });

    // Turned back on: the late tasks come back
    await page.getByTestId('unmute-reminders').click();
    await expect(page.getByTestId('profile-late')).toHaveCount(2);
  });
});

test.describe('Reminder banner, like an Android notification', () => {
  test('swipe it away, close it, or snooze it for 10 minutes', async ({ page }) => {
    test.setTimeout(90_000);
    await page.clock.install({ time: new Date('2026-11-09T18:30:00') });
    await page.goto('/');
    await removeMorningTasks(page);
    await enterParentMode(page);
    await setDueTime(page, 'Vider son cartable', '18:00');
    await page.getByRole('button', { name: 'Quitter le Mode Parent' }).click();

    const banner = page.getByTestId('reminder-banner');
    // The browser clock is simulated: move it forward second by second until a banner shows
    const nextBanner = async () => {
      for (let i = 0; i < 400 && !(await banner.isVisible()); i++) await page.clock.runFor(1000);
      await expect(banner).toBeVisible();
    };
    await nextBanner();

    // Swipe sideways: it leaves
    const box = (await banner.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + 20);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 60, box.y + 22, { steps: 4 });
    await page.mouse.move(box.x + box.width / 2 + 200, box.y + 24, { steps: 4 });
    await page.mouse.up();
    await expect(banner).toHaveCount(0);

    // Next one (the other child, or a repeat): closed with ✕
    await nextBanner();
    await banner.getByTestId('reminder-close').click();
    await expect(banner).toHaveCount(0);

    // Snooze: the child's reminders wait 10 minutes, the late badge stays
    await nextBanner();
    const child = (await banner.textContent())!.includes('Léo') ? 'Léo' : 'Emma';
    await banner.getByTestId('reminder-snooze').click();
    await expect(banner).toHaveCount(0);
    await expect(page.getByTestId('profile-late')).toHaveCount(2);
    // During the next 9 minutes, no banner for that child
    for (let i = 0; i < 9 * 60; i += 5) {
      await page.clock.runFor(5000);
      if (await banner.isVisible()) {
        await expect(banner).not.toContainText(child);
        await banner.getByTestId('reminder-close').click();
      }
    }
  });
});

