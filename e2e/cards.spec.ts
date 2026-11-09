import { test, expect } from './fixtures';
import type { Page } from '@playwright/test';
import { completeTask, enterParentMode, removeMorningTasks } from './helpers';

const typePin = async (page: Page) => {
  for (const digit of ['1', '2', '3', '4']) await page.getByRole('button', { name: digit, exact: true }).click();
};

const giveCard = async (page: Page, color: 'yellow' | 'red', reason?: string) => {
  await page.getByTestId('give-card').click();
  const giver = page.getByTestId('card-giver');
  await giver.getByTestId(`card-option-${color}`).click();
  if (reason) await giver.getByRole('button', { name: reason }).click();
  await giver.getByRole('button', { name: /Valider avec le code parent/ }).click();
  await expect(page.getByText('Un parent valide le carton avec son code.')).toBeVisible();
  await typePin(page);
};

test.describe('Yellow and red cards', () => {
  test('yellow warns, a second yellow becomes red and resets the medal progress; parents can withdraw', async ({ page }) => {
    await page.goto('/');
    await removeMorningTasks(page);
    await page.getByTestId('child-card-leo').click();
    await completeTask(page, 'Vider son cartable');
    await completeTask(page, 'Prendre son goûter');
    const meter = page.getByTestId('star-meter');
    await expect(meter.locator('span.grayscale')).toHaveCount(1); // 2 of 3 stars

    // First yellow: a warning, stars untouched
    await giveCard(page, 'yellow', 'Dispute');
    const reveal = page.getByTestId('card-reveal');
    await expect(reveal).toHaveAttribute('data-card', 'yellow');
    await expect(reveal).toContainText('Carton jaune');
    await expect(reveal).toContainText('Dispute');
    await reveal.click();
    await expect(page.getByTestId('give-card')).toHaveAttribute('data-yellow', '1');
    await expect(meter.locator('span.grayscale')).toHaveCount(1);

    // Second yellow the same evening: red card, progress back to zero
    await page.getByTestId('give-card').click();
    await expect(page.getByTestId('card-giver')).toContainText('un 2e jaune donnera un carton rouge');
    await page.getByTestId('card-giver').getByRole('button', { name: /Valider avec le code parent/ }).click();
    await typePin(page);
    await expect(reveal).toHaveAttribute('data-card', 'red');
    await expect(reveal).toContainText('2e carton jaune : carton rouge !');
    await expect(reveal).toContainText('−2 ⭐');
    await reveal.click();
    await expect(meter.locator('span.grayscale')).toHaveCount(3);
    await expect(page.getByTestId('medal-count')).toHaveText('0'); // medals untouched (none yet)

    // The selection screen shows tonight's cards
    await page.locator('header').getByRole('button').first().click();
    const card = page.getByTestId('child-card-leo');
    await expect(card.getByTestId('home-card')).toHaveAttribute('data-level', 'red');
    await expect(card.getByTestId('home-card')).toHaveAttribute('data-yellow', '2');
    await expect(page.getByTestId('child-card-emma').getByTestId('home-card')).toHaveCount(0);

    // Parent withdraws the second yellow (given by mistake): the red goes too, stars come back
    await enterParentMode(page);
    await page.getByRole('button', { name: 'Historique', exact: true }).click();
    const entries = page.getByTestId('card-history').getByTestId('card-entry');
    await expect(entries).toHaveCount(3);
    const withdraw = entries.nth(1).getByRole('button', { name: 'Retirer ce carton' });
    await withdraw.click();
    await withdraw.click();
    await expect(entries).toHaveCount(1);
    await page.getByRole('button', { name: 'Quitter le Mode Parent' }).click();
    await page.getByTestId('child-card-leo').click();
    // Opening the board with a card tonight shows a quiet reminder of the remaining yellow
    await expect(reveal).toHaveAttribute('data-mode', 'reminder');
    await expect(reveal).toHaveAttribute('data-card', 'yellow');
    await reveal.click();
    await expect(meter.locator('span.grayscale')).toHaveCount(1);
    await expect(page.getByTestId('give-card')).toHaveAttribute('data-red', '0');
  });

  test('tonight\'s card stays visible: banner, frame, star counter, home card, reminder when the board opens', async ({ page }) => {
    await page.clock.setFixedTime(new Date('2026-11-09T18:30:00'));
    await page.goto('/');
    await removeMorningTasks(page);
    await page.getByTestId('child-card-leo').click();
    const reveal = page.getByTestId('card-reveal');

    // No card: nothing shown
    await expect(page.getByTestId('card-banner')).toHaveCount(0);
    await expect(page.getByTestId('card-frame')).toHaveCount(0);

    // Yellow card: banner and yellow frame stay after the reveal
    await giveCard(page, 'yellow', 'Gros mots');
    await expect(reveal).toHaveAttribute('data-mode', 'given');
    await reveal.click();
    const banner = page.getByTestId('card-banner');
    await expect(banner).toHaveAttribute('data-level', 'yellow');
    await expect(banner).toContainText("Carton jaune aujourd'hui · Gros mots");
    await expect(page.getByTestId('card-frame')).toHaveAttribute('data-level', 'yellow');
    await expect(page.getByTestId('star-meter-card')).toHaveCount(0); // a yellow does not touch the stars

    // Tapping the banner shows the card again, quietly
    await banner.click();
    await expect(reveal).toHaveAttribute('data-mode', 'reminder');
    await expect(reveal).toContainText("Rappel : carton jaune aujourd'hui");
    await reveal.click();

    // Red card: red everywhere, card stuck on the star counter
    await giveCard(page, 'red', 'Comportement dangereux');
    await reveal.click();
    await expect(banner).toHaveAttribute('data-level', 'red');
    await expect(banner).toContainText('étoiles remises à zéro');
    await expect(page.getByTestId('card-frame')).toHaveAttribute('data-level', 'red');
    await expect(page.getByTestId('star-meter-card')).toBeVisible();
    await expect(page.getByTestId('card-reset-hint')).toBeVisible();

    // Home: card stuck on the avatar, reason shown
    await page.locator('header').getByRole('button').first().click();
    const leo = page.getByTestId('child-card-leo');
    await expect(leo).toHaveAttribute('data-card-level', 'red');
    await expect(leo.getByTestId('home-card')).toBeVisible();
    await expect(leo.getByTestId('home-card-reason')).toContainText("Carton rouge aujourd'hui · Comportement dangereux");

    // Reopening the board: reminder first, which closes by itself
    await leo.click();
    await expect(reveal).toHaveAttribute('data-mode', 'reminder');
    await expect(reveal).toContainText("Rappel : carton rouge aujourd'hui");
    await expect(reveal).toHaveCount(0, { timeout: 8000 });

    // Next evening: everything is gone
    await page.clock.setFixedTime(new Date('2026-11-10T18:30:00'));
    await page.reload();
    await expect(page.getByTestId('child-card-leo')).toHaveAttribute('data-card-level', 'none');
    await page.getByTestId('child-card-leo').click();
    await expect(page.getByTestId('card-banner')).toHaveCount(0);
    await expect(page.getByTestId('card-frame')).toHaveCount(0);
    await expect(reveal).toHaveCount(0);
  });

  test('a card needs the parent PIN', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('child-card-emma').click();
    await page.getByTestId('give-card').click();
    await page.getByTestId('card-giver').getByTestId('card-option-red').click();
    await page.getByTestId('card-giver').getByRole('button', { name: /Valider avec le code parent/ }).click();
    for (const digit of ['9', '9', '9', '9']) await page.getByRole('button', { name: digit, exact: true }).click();
    await expect(page.getByTestId('card-reveal')).toHaveCount(0);
    await expect(page.getByTestId('give-card')).toHaveAttribute('data-red', '0');
  });
});
