import { test, expect } from '@playwright/test';
import { openTaskForm } from './helpers';

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

    // 4. Open the (folded) new task form, then fill the task name
    await openTaskForm(page);
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

  test('should persist task reordering after a page reload', async ({ page }) => {
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
    const firstTaskRow = firstHandle.locator('xpath=../..');
    const secondTaskRow = secondHandle.locator('xpath=../..');
    const firstTaskLabel = await firstTaskRow.locator('p').textContent();
    const secondTaskLabel = await secondTaskRow.locator('p').textContent();

    expect(firstTaskLabel).toBeTruthy();
    expect(secondTaskLabel).toBeTruthy();

    // Drive dnd-kit's pointer sensor with a real mouse gesture.
    const firstHandleBox = await firstHandle.boundingBox();
    const secondHandleBox = await secondHandle.boundingBox();

    expect(firstHandleBox).not.toBeNull();
    expect(secondHandleBox).not.toBeNull();

    await page.mouse.move(
      firstHandleBox!.x + firstHandleBox!.width / 2,
      firstHandleBox!.y + firstHandleBox!.height / 2,
    );
    await page.mouse.down();
    await page.mouse.move(
      firstHandleBox!.x + firstHandleBox!.width / 2 + 10,
      firstHandleBox!.y + firstHandleBox!.height / 2,
      { steps: 5 },
    );
    await page.waitForTimeout(100);
    await page.mouse.move(
      secondHandleBox!.x + secondHandleBox!.width / 2,
      secondHandleBox!.y + secondHandleBox!.height * 0.75,
      { steps: 10 },
    );
    await page.mouse.up();

    await expect(dragHandles.nth(0).locator('xpath=../..').locator('p')).toHaveText(secondTaskLabel!);

    // Reload from IndexedDB and verify that the new order was persisted.
    await page.reload();
    await page.locator('button[aria-label="Mode Parent"]').click();
    await page.getByRole('button', { name: '1', exact: true }).click();
    await page.getByRole('button', { name: '2', exact: true }).click();
    await page.getByRole('button', { name: '3', exact: true }).click();
    await page.getByRole('button', { name: '4', exact: true }).click();

    const reorderedHandles = page.locator('button[aria-label="drag task"]');
    await expect(reorderedHandles.nth(0).locator('xpath=../..').locator('p')).toHaveText(secondTaskLabel!);
    await expect(reorderedHandles.nth(1).locator('xpath=../..').locator('p')).toHaveText(firstTaskLabel!);
  });
});
