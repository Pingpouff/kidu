import { test, expect } from '@playwright/test';
import { completeTask, enterParentMode } from './helpers';

test.describe('Personal tasks and selection screen summary', () => {
  test('a task can be assigned to one child only', async ({ page }) => {
    await page.goto('/');
    await enterParentMode(page);

    // Seeded example: homework is Léo's only
    const homework = page.getByTestId('task-group-after_school').getByTestId('task-row').filter({ hasText: 'Faire ses devoirs' });
    await expect(homework.getByTestId('task-assignees')).toContainText('Léo');

    // New task for Emma only
    const form = page.locator('form').filter({ has: page.locator('input[placeholder*="Nom de la tâche"]') });
    await form.locator('input[placeholder*="Nom de la tâche"]').fill('Nourrir le chat');
    await form.locator('input[placeholder*="Emoji"]').click();
    await page.locator('button').filter({ hasText: '🧸' }).first().click();
    await page.keyboard.press('Escape');
    await form.locator('select[aria-label="Catégorie"]').selectOption('after_school');
    const emmaChip = form.getByRole('button', { name: /Emma/ });
    await emmaChip.click();
    await expect(emmaChip).toHaveAttribute('aria-pressed', 'true');
    await expect(form.getByRole('button', { name: /Tous les enfants/ })).toHaveAttribute('aria-pressed', 'false');
    await form.locator('button[type="submit"]').click();
    const cat = page.getByTestId('task-group-after_school').getByTestId('task-row').filter({ hasText: 'Nourrir le chat' });
    await expect(cat.getByTestId('task-assignees')).toContainText('Emma');
    await page.getByRole('button', { name: 'Quitter le Mode Parent' }).click();

    // Emma gets it, Léo does not; homework is only on Léo's board
    await page.getByTestId('child-card-emma').click();
    await expect(page.locator('main')).toContainText('Nourrir le chat');
    await expect(page.locator('main')).not.toContainText('Faire ses devoirs');
    await page.locator('header').getByRole('button').first().click();

    await page.getByTestId('child-card-leo').click();
    await expect(page.locator('main')).toContainText('Faire ses devoirs');
    await expect(page.locator('main')).not.toContainText('Nourrir le chat');
  });

  test('the selection screen sums up where each child is', async ({ page }) => {
    await page.goto('/');
    const leo = page.getByTestId('child-card-leo');
    const emma = page.getByTestId('child-card-emma');
    await expect(leo.getByTestId('home-progress')).toContainText('Pas encore commencé');
    await expect(leo.getByTestId('home-progress')).toContainText('0/15');
    await expect(emma.getByTestId('home-progress')).toContainText('0/14'); // no homework for Emma
    await expect(leo.getByTestId('home-next')).toContainText('Vider son cartable');
    await expect(page.getByTestId('home-tonight')).toBeVisible();

    // Léo finishes one task and starts the next
    await leo.click();
    await completeTask(page, 'Vider son cartable');
    await page.locator('main').getByRole('button').filter({ hasText: 'Prendre son goûter' }).click();
    await expect(page.locator('[data-column="doing"]')).toContainText('Prendre son goûter');
    await page.locator('header').getByRole('button').first().click();

    await expect(leo.getByTestId('home-progress')).toContainText('Étape 1/3');
    await expect(leo.getByTestId('home-progress')).toContainText('1/15');
    await expect(leo.getByTestId('home-doing')).toContainText('Prendre son goûter');
    await expect(leo).toContainText('Médaille dans 2');
    await expect(emma.getByTestId('home-progress')).toContainText('Pas encore commencé');
  });

  test('due times show up in the evening overview', async ({ page }) => {
    await page.clock.setFixedTime(new Date('2026-11-09T18:00:00'));
    await page.goto('/');
    await enterParentMode(page);
    const row = page.getByTestId('task-group-meal').getByTestId('task-row').filter({ hasText: 'Mettre la table' });
    await row.getByRole('button', { name: 'edit task' }).click();
    await page.locator('input[type="time"]').last().fill('19:15');
    await page.getByRole('button', { name: 'save task' }).click();
    await page.getByRole('button', { name: 'Quitter le Mode Parent' }).click();

    const deadline = page.getByTestId('home-deadline').first();
    await expect(deadline).toContainText('19:15');
    await expect(deadline).toContainText('Mettre la table');
    await expect(deadline).toContainText('🦊');
    await expect(deadline).toContainText('🐼');
    await expect(page.getByTestId('child-card-leo').getByTestId('home-upcoming')).toContainText('19:15');
  });
});
