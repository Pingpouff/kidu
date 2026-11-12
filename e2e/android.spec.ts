import { test, expect } from './fixtures';
import { enterParentMode } from './helpers';

test.describe('Android Back button', () => {
  test('closes the window first, then goes back to the home screen', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('home-screen')).toBeVisible();

    // Board → Back → home
    await page.getByTestId('child-card-leo').click();
    await expect(page.getByTestId('home-screen')).toHaveCount(0);
    await page.goBack();
    await expect(page.getByTestId('home-screen')).toBeVisible();

    // A window on the board: Back closes it, the board stays
    await page.getByTestId('child-card-leo').click();
    await page.getByTestId('give-card').click();
    await expect(page.getByTestId('card-giver')).toBeVisible();
    await page.goBack();
    await expect(page.getByTestId('card-giver')).toHaveCount(0);
    await expect(page.getByTestId('give-card')).toBeVisible();
    await page.goBack();
    await expect(page.getByTestId('home-screen')).toBeVisible();

    // Closing a window with ✕ doesn't leave an extra step behind
    await page.getByTestId('child-card-leo').click();
    await page.getByTestId('give-card').click();
    await page.getByTestId('card-giver').getByRole('button', { name: 'Fermer' }).click();
    await expect(page.getByTestId('card-giver')).toHaveCount(0);
    await page.goBack();
    await expect(page.getByTestId('home-screen')).toBeVisible();

    // Parent Mode → Back → home
    await enterParentMode(page);
    await page.goBack();
    await expect(page.getByTestId('home-screen')).toBeVisible();
  });

  test('app shortcuts open the calm corner or the parent PIN', async ({ page }) => {
    await page.goto('/?open=parent');
    await expect(page.getByRole('button', { name: '1', exact: true })).toBeVisible(); // PIN pad
    await page.goto('/?open=calm');
    await expect(page.getByTestId('calm-corner')).toBeVisible();
  });
});
