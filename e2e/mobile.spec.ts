import { test, expect, type Page } from '@playwright/test';
import { completeTask, enterParentMode, removeMorningTasks } from './helpers';

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

/** No element wider than the screen (no sideways scrolling) */
const expectNoHorizontalScroll = async (page: Page) => {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
};

test.describe('Phone layout', () => {
  test('the board stacks the columns, "doing" first, with every task reachable', async ({ page }) => {
    await page.goto('/');
    await removeMorningTasks(page);
    await expectNoHorizontalScroll(page);
    await page.getByTestId('child-card-leo').click();
    await expectNoHorizontalScroll(page);

    const doing = page.locator('[data-column="doing"]');
    const todo = page.locator('[data-column="todo"]');
    const doingBox = (await doing.boundingBox())!;
    const todoBox = (await todo.boundingBox())!;
    expect(doingBox.y).toBeLessThan(todoBox.y); // stacked, doing on top
    expect(todoBox.x).toBeGreaterThanOrEqual(0);
    expect(todoBox.x + todoBox.width).toBeLessThanOrEqual(390);
    await expect(doing).toContainText('Touche une tâche pour la commencer');

    // The first to-do card is fully on screen and can be completed by taps
    await expect(todo.getByRole('button').first()).toBeInViewport({ ratio: 1 });
    await completeTask(page, 'Vider son cartable');
    await expect(page.locator('[data-column="done"]').getByRole('button')).toHaveCount(1);
  });

  test('parent mode fits the screen, with every tab reachable', async ({ page }) => {
    await page.goto('/');
    await enterParentMode(page);
    await expectNoHorizontalScroll(page);
    for (const tab of ['Enfants', 'Boutique', 'Historique', 'Paramètres', 'Routine & Tâches']) {
      const button = page.getByRole('button', { name: tab, exact: true });
      await expect(button).toBeInViewport({ ratio: 1 });
      await button.click();
      await expectNoHorizontalScroll(page);
    }
    await expect(page.getByRole('button', { name: 'Quitter le Mode Parent' })).toBeInViewport();
  });
});
