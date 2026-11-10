import { test, expect } from './fixtures';
import type { Page } from '@playwright/test';
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

  test('the home screen scrolls when its content is taller than the screen', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 500 });
    await page.goto('/');
    const home = page.getByTestId('home-screen');
    const tonight = page.getByTestId('home-tonight');
    await expect(tonight).toBeVisible();
    expect(await home.evaluate((el) => el.scrollHeight > el.clientHeight)).toBe(true);
    await expect(tonight).not.toBeInViewport({ ratio: 1 });

    await home.evaluate((el) => el.scrollTo(0, el.scrollHeight));
    await expect(page.getByText('Kidu, le compagnon des routines')).toBeInViewport();
    await expectNoHorizontalScroll(page);
  });

  test('a long changelog scrolls inside the "About" and version history windows', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 600 });
    await page.goto('/');

    /** The panel stays on screen and its list scrolls down to the oldest version */
    const expectScrollableList = async (panelId: string, listId: string) => {
      const panel = page.getByTestId(panelId);
      const list = panel.getByTestId(listId);
      await expect(panel).toBeInViewport({ ratio: 1 });
      expect(await list.evaluate((el) => el.scrollHeight > el.clientHeight)).toBe(true);
      await list.evaluate((el) => el.scrollTo(0, el.scrollHeight));
      await expect(list.getByText('Version 1.0.0')).toBeInViewport();
      await expect(panel.getByRole('button', { name: 'Fermer' })).toBeInViewport();
    };

    await page.getByTestId('about-button').click();
    await expectScrollableList('about', 'about-changelog');
    await page.getByTestId('about').getByRole('button', { name: 'Fermer' }).click();

    await enterParentMode(page);
    await page.getByRole('button', { name: 'Paramètres', exact: true }).click();
    await page.getByTestId('app-version').getByRole('button', { name: 'Historique des versions' }).click();
    await expectScrollableList('whats-new', 'whats-new-list');
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
