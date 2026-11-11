import { test, expect } from './fixtures';
import { completeTask, enterParentMode, removeMorningTasks } from './helpers';

test.describe('Stars, medals and piggy bank', () => {
  test('3 tasks give one medal the child picks, then exchanges in the shop; the treasure shows trophies and medals apart', async ({ page }) => {
    await page.goto('/');
    await removeMorningTasks(page);

    // Parent adds a cheap reward to the shop
    await enterParentMode(page);
    await page.getByRole('button', { name: 'Boutique' }).click();
    await page.getByPlaceholder('Récompense').fill('Câlin géant');
    await page.getByRole('spinbutton', { name: 'Prix en médailles' }).first().fill('1');
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

    // Third star: one single screen, "New medal! Pick it" — no separate medal reveal before it
    await completeTask(page, 'Faire ses devoirs', { dismiss: false });
    const choice = page.getByTestId('medal-choice');
    await expect(choice).toBeVisible();
    await expect(choice).toContainText('Nouvelle médaille');
    const reveal = page.getByTestId('reward-reveal');
    await expect(reveal).toHaveCount(0);
    const options = choice.getByTestId('medal-option');
    await expect(options).toHaveCount(3);
    await expect(options.first().getByTestId('medal-disc')).toBeVisible();
    const chosenName = await options.nth(1).getAttribute('aria-label');
    await options.nth(1).click();
    await expect(choice).toBeHidden();

    // Then the trophies it unlocked (first medal…), never a second "new medal"
    await expect(reveal).toContainText('Nouveau trophée');
    for (let i = 0; i < 6 && (await reveal.isVisible()); i++) {
      await expect(reveal).not.toContainText('Nouvelle médaille');
      await reveal.click();
    }

    await expect(medalCount).toHaveText('1');
    await expect(page.getByTestId('piggy-header-count')).toHaveText('1');

    // Piggy bank, in medals
    await page.getByRole('button', { name: 'Tirelire de' }).click();
    const piggy = page.getByTestId('piggy-bank');
    await expect(piggy.getByTestId('piggy-count')).toContainText('1 médaille');

    // "My treasure": trophies and medals in two sections
    await piggy.getByTestId('open-treasure').click();
    const treasure = page.getByTestId('treasure-view');
    await expect(treasure).toBeVisible();
    await treasure.getByTestId('treasure-chest').click();
    await expect(treasure.getByTestId('treasure-medals')).toContainText('1');
    await expect(treasure.getByTestId('treasure-badges')).toHaveCount(0);

    const showcase = treasure.getByTestId('treasure-trophy-showcase');
    await expect(showcase.getByTestId('trophy-medal_1')).toHaveAttribute('data-earned', 'true');
    const toWin = showcase.getByTestId('trophy-medals_50');
    await expect(toWin).toHaveAttribute('data-earned', 'false');
    await expect(toWin).toContainText('Gagne 50 médailles');
    await expect(showcase.locator('[data-testid^="trophy-"]')).toHaveCount(23);

    const medals = treasure.getByTestId('treasure-medal-section');
    await expect(medals.getByTestId('treasure-medal-summary')).toContainText('Gagnées : 1');
    await medals.getByRole('button', { name: chosenName! }).click();
    await expect(treasure.getByTestId('treasure-name')).toHaveText(chosenName!);
    await expect(treasure.getByTestId('treasure-collections').getByText('1/6')).toHaveCount(1);
    await treasure.getByTestId('treasure-spotlight').click();
    await treasure.getByRole('button', { name: 'Fermer' }).click();
    await expect(treasure).toBeHidden();

    // Exchange the medal, approved with the parent PIN
    await expect(piggy).toBeVisible();
    const item = piggy.getByTestId('shop-item').filter({ hasText: 'Câlin géant' });
    await item.getByRole('button', { name: 'Échanger' }).click();
    await expect(page.getByText('Un parent doit valider')).toBeVisible();
    for (const digit of ['1', '2', '3', '4']) {
      await page.getByRole('button', { name: digit, exact: true }).click();
    }
    await expect(piggy.getByRole('status')).toContainText('Câlin géant');
    await expect(piggy.getByTestId('piggy-count')).toContainText('0 médaille');

    // The album keeps the spent medal
    await piggy.getByRole('tab', { name: /Album/ }).click();
    await expect(piggy).toContainText(chosenName!);
    await expect(piggy).toContainText('Échangée : Câlin géant');

    // Nowhere does a child see the word "badge"
    for (const text of [await piggy.innerText(), await page.locator('body').innerText()]) {
      expect(text.toLowerCase()).not.toContain('badge');
    }
  });

  test('a done → todo → done toggle does not give a second star', async ({ page }) => {
    await page.goto('/');
    await removeMorningTasks(page);
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
