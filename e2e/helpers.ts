import { expect, type Page } from '@playwright/test';

export const enterParentMode = async (page: Page) => {
  await page.locator('button[aria-label="Mode Parent"]').click();
  for (const digit of ['1', '2', '3', '4']) {
    await page.getByRole('button', { name: digit, exact: true }).click();
  }
  await expect(page.locator('h1')).toContainText(/Tableau de bord/i);
};

/**
 * Closes reward screens that may pop over the board: medal/trophy reveals
 * (tap to continue) and the badge choice (picks the first badge).
 */
export const dismissRewards = async (page: Page) => {
  const reveal = page.getByTestId('reward-reveal');
  const choice = page.getByTestId('badge-choice');
  // Reveals and choices can chain (medal → trophy → badge choice)
  for (let i = 0; i < 20; i++) {
    await page.waitForTimeout(150);
    if (await reveal.isVisible()) {
      await reveal.click();
    } else if (await choice.isVisible()) {
      await choice.getByTestId('badge-option').first().click();
      await expect(choice.getByTestId('badge-option').first()).not.toBeVisible({ timeout: 5000 }).catch(() => {});
    } else {
      return;
    }
  }
};

/** Taps a card twice: todo → doing → done, then closes any reward screen */
export const completeTask = async (page: Page, label: string, { dismiss = true } = {}) => {
  const card = page.locator('main').getByRole('button').filter({ hasText: label });
  await card.click();
  const doingCard = page.locator('[data-column="doing"]').getByRole('button').filter({ hasText: label });
  await expect(doingCard).toHaveCount(1);
  // The "doing" card pulses continuously, so it never becomes "stable" for Playwright
  await doingCard.click({ force: true });
  await expect(card).toHaveCount(0); // label is hidden once done
  if (dismiss) await dismissRewards(page);
};

/** The "new task" form is folded by default */
export const openTaskForm = async (page: Page) => {
  const opener = page.getByTestId('open-task-form');
  if (await opener.isVisible()) await opener.click();
  await expect(page.locator('input[placeholder*="Nom de la tâche"]')).toBeVisible();
};
