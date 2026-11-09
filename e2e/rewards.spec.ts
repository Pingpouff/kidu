import { test, expect } from '@playwright/test';
import { completeTask, enterParentMode } from './helpers';

test.describe('Stars, medals, badges and piggy bank', () => {
  test('3 tasks give a medal, the child picks a badge and exchanges it in the shop', async ({ page }) => {
    await page.goto('/');

    // Parent adds a cheap reward to the shop
    await enterParentMode(page);
    await page.getByRole('button', { name: 'Boutique' }).click();
    await page.getByPlaceholder('Récompense').fill('Câlin géant');
    await page.getByRole('spinbutton', { name: 'Prix en badges' }).first().fill('1');
    await page.getByRole('button', { name: 'Ajouter' }).click();
    await expect(page.getByTestId('shop-list').locator('input[value="Câlin géant"]')).toHaveCount(1);
    await page.getByRole('button', { name: 'Quitter le Mode Parent' }).click();

    // Child: each task done gives a star
    await page.getByRole('button').filter({ hasText: 'Léo' }).click();
    const medalCount = page.getByTestId('medal-count');
    await expect(medalCount).toHaveText('0');

    await completeTask(page, 'Vider son cartable');
    await completeTask(page, 'Prendre son goûter');
    await expect(page.getByText('Plus qu\'une étoile pour la médaille !')).toBeVisible();

    // Third star: medal reveal, then badge choice
    await completeTask(page, 'Faire ses devoirs', { dismiss: false });
    const reveal = page.getByTestId('reward-reveal');
    await expect(reveal).toContainText('Nouvelle médaille');
    await reveal.click();
    // Other reveals (trophies such as "Lightning") may follow
    while (await reveal.isVisible()) await reveal.click();

    const choice = page.getByTestId('badge-choice');
    await expect(choice).toBeVisible();
    const options = choice.getByTestId('badge-option');
    await expect(options).toHaveCount(3);
    const chosenName = await options.nth(1).getAttribute('aria-label');
    await options.nth(1).click();
    await expect(choice).toBeHidden();

    await expect(medalCount).toHaveText('1');
    await expect(page.getByTestId('piggy-header-count')).toHaveText('1');

    // Piggy bank: exchange the badge, approved with the parent PIN
    await page.getByRole('button', { name: 'Tirelire de' }).click();
    const piggy = page.getByTestId('piggy-bank');
    await expect(piggy.getByTestId('piggy-count')).toContainText('1 badge');

    // "My treasure": open the chest, the new badge is shown in big with its collection
    await piggy.getByTestId('open-treasure').click();
    const treasure = page.getByTestId('treasure-view');
    await expect(treasure).toBeVisible();
    await treasure.getByTestId('treasure-chest').click();
    await expect(treasure.getByTestId('treasure-name')).toBeVisible();
    await expect(treasure.getByTestId('treasure-badges')).toContainText('1');
    await expect(treasure.getByTestId('treasure-medals')).toContainText('1');
    // Trophies (if any were unlocked) come first: browse until the badge shows up
    for (let i = 0; i < 5 && (await treasure.getByTestId('treasure-name').textContent()) !== chosenName; i++) {
      await treasure.getByRole('button', { name: 'Trésor suivant' }).click();
    }
    await expect(treasure.getByTestId('treasure-name')).toHaveText(chosenName!);
    await expect(treasure.getByTestId('treasure-collections').getByText('1/6')).toHaveCount(1);
    await treasure.getByTestId('treasure-spotlight').click();
    await treasure.getByRole('button', { name: 'Fermer' }).click();
    await expect(treasure).toBeHidden();
    await expect(piggy).toBeVisible();
    const item = piggy.getByTestId('shop-item').filter({ hasText: 'Câlin géant' });
    await item.getByRole('button', { name: 'Échanger' }).click();
    await expect(page.getByText('Un parent doit valider')).toBeVisible();
    for (const digit of ['1', '2', '3', '4']) {
      await page.getByRole('button', { name: digit, exact: true }).click();
    }
    await expect(piggy.getByRole('status')).toContainText('Câlin géant');
    await expect(piggy.getByTestId('piggy-count')).toContainText('0 badge');

    // The album keeps the spent badge
    await piggy.getByRole('tab', { name: /Album/ }).click();
    await expect(piggy).toContainText(chosenName!);
    await expect(piggy).toContainText('Échangé : Câlin géant');
  });

  test('a done → todo → done toggle does not give a second star', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button').filter({ hasText: 'Léo' }).click();

    await completeTask(page, 'Vider son cartable');
    await expect(page.getByTestId('star-meter').locator('span.grayscale')).toHaveCount(2);

    // Tap the done card to send it back to "todo", then complete it again
    await page.locator('[data-column="done"]').getByRole('button').first().click({ force: true });
    await completeTask(page, 'Vider son cartable');
    await expect(page.getByTestId('star-meter').locator('span.grayscale')).toHaveCount(2);
  });

  test('parents can tone down sounds and animations', async ({ page }) => {
    await page.goto('/');
    await enterParentMode(page);
    await page.getByRole('button', { name: 'Paramètres' }).click();

    await page.getByLabel('Chanson du dodo').uncheck();
    await page.getByRole('combobox').filter({ hasText: 'Complètes' }).selectOption('reduced');
    await page.getByRole('button', { name: 'Sauvegarder' }).click();

    await expect(page.locator('html')).toHaveClass(/reduce-motion/);
    await page.reload();
    await expect(page.locator('html')).toHaveClass(/reduce-motion/);
    await enterParentMode(page);
    await page.getByRole('button', { name: 'Paramètres' }).click();
    await expect(page.getByLabel('Chanson du dodo')).not.toBeChecked();
  });
});
