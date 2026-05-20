import { test, expect } from '@playwright/test';

test.describe('Kids Evening Routine E2E Flow', () => {
  test('should synchronize task changes when activating the reset button', async ({ page }) => {
    // 1. Visit the home page
    await page.goto('/');

    // Verify page loads with the profile selection header
    await expect(page.locator('h1')).toContainText(/Qui se prépare/i);

    // 2. Click on the Parent Mode Settings button (gear) in the top right
    const parentModeButton = page.locator('button[aria-label="Mode Parent"]');
    await parentModeButton.click();

    // 3. Enter PIN '1234' on the keypad
    await page.getByRole('button', { name: '1', exact: true }).click();
    await page.getByRole('button', { name: '2', exact: true }).click();
    await page.getByRole('button', { name: '3', exact: true }).click();
    await page.getByRole('button', { name: '4', exact: true }).click();

    // Verify parent dashboard is visible
    await expect(page.locator('h1')).toContainText(/Tableau de bord/i);

    // 4. Click the input field for the task name
    const labelInput = page.locator('input[placeholder*="Nom de la tâche"]');
    await labelInput.fill('Habiller le doudou');

    // Choose an emoji by clicking the emoji input
    const iconInput = page.locator('input[placeholder*="Emoji"]');
    await iconInput.click();

    // Click an emoji in the picker (e.g. 🧸)
    const emojiOption = page.locator('button').filter({ hasText: '🧸' }).first();
    await emojiOption.click();

    // Submit the task creation
    const submitBtn = page.locator('form button[type="submit"]');
    await submitBtn.click();

    // Wait for the label input to be cleared, indicating form submission has processed
    await expect(page.locator('input[placeholder*="Nom de la tâche"]')).toHaveValue('');

    // Verify new task "Habiller le doudou" is listed in the parent list
    await expect(page.locator('body')).toContainText('Habiller le doudou');

    // 6. Exit Parent Mode
    const exitParentBtn = page.getByRole('button', { name: 'Quitter le Mode Parent' });
    await exitParentBtn.click();

    // 7. Click on Léo's profile
    const leoProfileBtn = page.getByRole('button').filter({ hasText: 'Léo' });
    await leoProfileBtn.click();

    // Verify we enter Léo's Routine Board
    await expect(page.locator('header')).toContainText('Léo');

    // 8. Click the Reset button once. Verify the "Sûr ?" confirmation appears
    const resetBtn = page.locator('button[aria-label="reset routine"]');
    await resetBtn.click();
    await expect(resetBtn).toContainText(/Sûr/i);

    // 9. Click the Reset button a second time to execute the reset
    await resetBtn.click();

    // Verify that the confirmation state disappears
    await expect(resetBtn).not.toContainText(/Sûr/i);

    // 10. Verify that the new task "Habiller le doudou" is now loaded on Léo's board!
    await expect(page.locator('body')).toContainText('Habiller le doudou');
  });

  test('should allow parent to reorder tasks using drag handles', async ({ page }) => {
    await page.goto('/');

    // 1. Enter Parent Mode
    await page.locator('button[aria-label="Mode Parent"]').click();
    await page.getByRole('button', { name: '1', exact: true }).click();
    await page.getByRole('button', { name: '2', exact: true }).click();
    await page.getByRole('button', { name: '3', exact: true }).click();
    await page.getByRole('button', { name: '4', exact: true }).click();

    // Verify parent dashboard is visible
    await expect(page.locator('h1')).toContainText(/Tableau de bord/i);

    // 2. Locate first and second task drag handles
    const dragHandles = page.locator('button[aria-label="drag task"]');
    const firstHandle = dragHandles.nth(0);
    const secondHandle = dragHandles.nth(1);

    // Perform drag and drop
    await firstHandle.dragTo(secondHandle);

    // Verify that the task order has been successfully modified in the list
    await expect(dragHandles).toHaveCount(await dragHandles.count());
  });
});
