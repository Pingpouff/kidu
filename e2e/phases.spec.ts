import { test, expect } from '@playwright/test';
import { completeTask, dismissRewards, enterParentMode, openTaskForm } from './helpers';

test.describe('Routine phases', () => {
  test('shows one phase at a time and moves to the next when it is done', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button').filter({ hasText: 'Léo' }).click();

    const indicator = page.getByTestId('phase-indicator');
    await expect(indicator).toContainText('Étape 1/3');
    await expect(indicator).toContainText("Après l'école");
    await expect(indicator).toContainText('Ensuite : Repas');

    // Only after-school tasks are on the board
    await expect(page.locator('main')).toContainText('Prendre son goûter');
    await expect(page.locator('main')).not.toContainText('Mettre la table');
    await expect(page.locator('main')).not.toContainText('Se brosser les dents');

    for (const label of ['Vider son cartable', 'Prendre son goûter', 'Faire ses devoirs']) {
      await completeTask(page, label);
    }
    // Keep reward screens open for the last one: the step banner only lasts 2.5 s
    await completeTask(page, 'Prendre son bain', { dismiss: false });

    // Phase complete banner, then the meal phase
    await expect(page.getByTestId('phase-banner')).toContainText('Étape terminée');
    await dismissRewards(page);
    await expect(indicator).toContainText('Étape 2/3');
    await expect(indicator).toContainText('Repas');
    await expect(page.locator('main')).toContainText('Mettre la table');
    await expect(page.locator('main')).not.toContainText('Prendre son goûter');
  });

  test('lets the parent assign a category to a new task', async ({ page }) => {
    await page.goto('/');
    await enterParentMode(page);

    await openTaskForm(page);
    await page.locator('input[placeholder*="Nom de la tâche"]').fill('Préparer le cartable');
    await page.locator('input[placeholder*="Emoji"]').click();
    await page.locator('button').filter({ hasText: '🧸' }).first().click();
    await page.locator('form select[aria-label="Catégorie"]').selectOption('bedtime');
    await page.locator('form button[type="submit"]').click();
    await expect(page.locator('input[placeholder*="Nom de la tâche"]')).toHaveValue('');

    await expect(page.getByTestId('task-group-bedtime')).toContainText('Préparer le cartable');
    await expect(page.getByTestId('task-group-after_school')).not.toContainText('Préparer le cartable');
  });
});
