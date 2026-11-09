import { test, expect, type Page } from '@playwright/test';
import { completeTask, enterParentMode } from './helpers';

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
    await expect(card.getByTestId('home-card-yellow')).toContainText('2');
    await expect(card.getByTestId('home-card-red')).toContainText('1');
    await expect(page.getByTestId('child-card-emma').getByTestId('home-card-yellow')).toHaveCount(0);

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
    await expect(meter.locator('span.grayscale')).toHaveCount(1);
    await expect(page.getByTestId('give-card')).toHaveAttribute('data-red', '0');
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
