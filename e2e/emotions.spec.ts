import { test, expect } from './fixtures';
import type { Page } from '@playwright/test';
import { completeTask, enterParentMode, keepOnlyTasks } from './helpers';

/** Fake clock, so 40 s of breathing take no time (the weekend fixture may already have installed it). */
const installClock = async (page: Page) => {
  try {
    await page.clock.install({ time: new Date('2026-11-11T18:00:00') });
  } catch {
    // already installed by the school-day fixture
  }
};

/** Emotion logs saved in IndexedDB */
const emotionLogs = (page: Page) =>
  page.evaluate(
    () =>
      new Promise<Array<Record<string, unknown>>>((resolve, reject) => {
        const open = indexedDB.open('ChildrenEveningRoutineDB');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const request = open.result.transaction('emotionLogs').objectStore('emotionLogs').getAll();
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        };
      })
  );

test.describe('Mes émotions — calm corner', () => {
  test('from the home screen, without a PIN: breathe with the cloud, then back to real life', async ({ page }) => {
    await installClock(page);
    await page.goto('/');
    await page.getByTestId('calm-button').click();

    const calm = page.getByTestId('calm-corner');
    await expect(calm).toBeVisible();
    await page.clock.runFor(9_000); // spoken intro (or its fallback), then the first breath
    await expect(calm).toHaveAttribute('data-stage', 'breathing');
    await expect(page.getByTestId('calm-phase-text')).toContainText('Inspire');
    await expect(page.getByTestId('calm-cloud')).toHaveAttribute('data-phase', 'inhale');

    await page.clock.runFor(4_000);
    await expect(page.getByTestId('calm-phase-text')).toContainText('Souffle');
    await expect(page.getByTestId('calm-cloud')).toHaveAttribute('data-phase', 'exhale');

    // 4 breaths of 10 s, then "Next, in real life": a grown-up first
    await page.clock.runFor(36_000);
    const next = page.getByTestId('calm-next');
    await expect(next).toBeVisible();
    await expect(page.getByTestId('calm-option-adult')).toHaveText(/Aller voir Papa ou Maman/);
    await expect(next.getByRole('button')).toHaveCount(4); // grown-up, 2 strategies, one more breath

    // One more breath, once
    await page.getByTestId('calm-again').click();
    await expect(calm).toHaveAttribute('data-stage', 'breathing');
    await page.clock.runFor(10_500);
    await expect(next).toBeVisible();
    await expect(page.getByTestId('calm-again')).toHaveCount(0);

    await page.getByTestId('calm-option-adult').click();
    await expect(page.getByTestId('calm-bye')).toContainText('Aller voir Papa ou Maman');
    await page.getByTestId('calm-done').click();
    await expect(calm).toHaveCount(0);

    const logs = await emotionLogs(page);
    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({ kind: 'calm', breaths: 5, nextAction: 'adult' });
    expect(logs[0]).not.toHaveProperty('childId');
    // No reward of any kind for breathing
    await expect(page.getByTestId('reward-reveal')).toHaveCount(0);
  });

  test('the cloud visibly puffs up when breathing in and shrinks when breathing out', async ({ page }) => {
    // Real clock: CSS transitions run in real time
    await page.goto('/');
    await page.getByTestId('calm-button').click();
    const cloud = page.getByTestId('calm-cloud');
    const body = page.getByTestId('calm-cloud-body');
    const width = async () => (await body.boundingBox())!.width;

    await expect(cloud).toHaveAttribute('data-phase', 'inhale', { timeout: 15_000 });
    await page.waitForTimeout(3_700); // end of the 4 s breath in
    const full = await width();
    await expect(cloud).toHaveAttribute('data-phase', 'exhale', { timeout: 2_000 });
    await page.waitForTimeout(5_700); // end of the 6 s breath out
    const empty = await width();

    expect(full / empty).toBeGreaterThan(1.35);
  });

  test("from a child's board, and the screen closes by itself once the child has gone back to real life", async ({ page }) => {
    await installClock(page);
    await page.goto('/');
    await page.getByTestId('child-card-leo').click();
    await page.getByTestId('calm-button').click();
    const calm = page.getByTestId('calm-corner');
    await expect(calm).toBeVisible();

    await page.clock.runFor(9_000 + 40_000);
    await expect(page.getByTestId('calm-next')).toBeVisible();
    await page.getByTestId('calm-next').getByRole('button').nth(1).click(); // a strategy
    await expect(page.getByTestId('calm-bye')).toBeVisible();
    await page.clock.runFor(21_000);
    await expect(calm).toHaveCount(0);

    const logs = await emotionLogs(page);
    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({ kind: 'calm', childId: 'leo', breaths: 4 });
    expect(logs[0].nextAction).not.toBe('adult');
  });

  test('"I\'m done" stops the breathing early; nothing is saved when no breath was taken', async ({ page }) => {
    await installClock(page);
    await page.goto('/');
    await page.getByTestId('calm-button').click();
    await page.getByTestId('calm-done').click(); // during the intro
    await expect(page.getByTestId('calm-next')).toBeVisible();
    await page.getByTestId('calm-done').click(); // close
    await expect(page.getByTestId('calm-corner')).toHaveCount(0);
    expect(await emotionLogs(page)).toHaveLength(0);
  });

  test("the parent names the grown-up, or turns the emotions space off", async ({ page }) => {
    await installClock(page);
    await page.goto('/');
    await enterParentMode(page);
    await page.getByRole('button', { name: 'Paramètres', exact: true }).click();
    await page.getByTestId('settings-adult-name').fill('Maman');
    await page.getByRole('button', { name: 'Sauvegarder' }).click();
    await page.getByRole('button', { name: 'Quitter le Mode Parent' }).click();

    await page.getByTestId('calm-button').click();
    await page.getByTestId('calm-done').click();
    await expect(page.getByTestId('calm-option-adult')).toHaveText(/Aller voir Maman/);
    await page.getByTestId('calm-done').click();

    await enterParentMode(page);
    await page.getByRole('button', { name: 'Paramètres', exact: true }).click();
    await page.getByTestId('settings-emotions').getByRole('checkbox').first().uncheck();
    await page.getByRole('button', { name: 'Sauvegarder' }).click();
    await page.getByRole('button', { name: 'Quitter le Mode Parent' }).click();
    await expect(page.getByTestId('child-card-leo')).toBeVisible();
    await expect(page.getByTestId('calm-button')).toHaveCount(0);
    await expect(page.getByTestId('emotions-button-leo')).toHaveCount(0);
  });

  test('fits a phone screen', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 700 });
    await installClock(page);
    await page.goto('/');
    await page.getByTestId('calm-button').click();
    await page.getByTestId('calm-done').click();
    await expect(page.getByTestId('calm-next')).toBeVisible();
    await expect(page.getByTestId('calm-option-adult')).toBeInViewport();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
});

/** Sets Léo's age (level of the emotions space) and reloads */
const setLeoAge = async (page: Page, age: number) => {
  await page.evaluate(
    (age) =>
      new Promise<void>((resolve) => {
        const open = indexedDB.open('ChildrenEveningRoutineDB');
        open.onsuccess = () => {
          const store = open.result.transaction('profiles', 'readwrite').objectStore('profiles');
          const get = store.get('leo');
          get.onsuccess = () => {
            store.put({ ...get.result, age }).onsuccess = () => resolve();
          };
        };
      }),
    age
  );
  await page.reload();
};

test.describe('Mes émotions — how I feel and my toolbox', () => {
  test('a 5-year-old names a feeling, shows where it is in the body, gets a kind reply and ideas', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('emotions-button-leo').click();
    const hub = page.getByTestId('emotions-hub');
    await expect(hub).toContainText('Bonjour Léo');
    await page.getByTestId('hub-checkin').click();

    // Level 1 (5 years old): the 6 basic feelings, no intensity step
    await expect(page.getByTestId('checkin-emotions').getByRole('button')).toHaveCount(6);
    await page.getByTestId('emotion-anger').click();
    await page.getByTestId('checkin-next').click();
    await expect(page.getByTestId('checkin')).toHaveAttribute('data-step', 'body');
    await page.getByTestId('zone-hands').click();
    await page.getByTestId('checkin-next').click();

    const reply = page.getByTestId('checkin-response');
    await expect(reply).toContainText('Colère');
    await expect(reply).toContainText('Ta colère a le droit d’être là');
    const cards = reply.locator('[data-testid^="strategy-"]:not([data-testid="strategy-helpful"])');
    await expect(cards).toHaveCount(2);
    const firstId = (await cards.first().getAttribute('data-testid'))!.replace('strategy-', '');
    await cards.first().getByRole('button').first().click(); // listen / try
    await cards.first().getByTestId('strategy-helpful').click(); // "ça m'aide"
    await expect(cards.first().getByTestId('strategy-helpful')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('checkin-calm')).toBeVisible();
    await page.getByTestId('checkin-finish').click();
    await expect(hub).toHaveAttribute('data-screen', 'hub');

    const logs = await emotionLogs(page);
    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({ kind: 'checkin', childId: 'leo', emotionId: 'anger', bodyZones: ['hands'], strategyIds: [firstId] });
    expect(logs[0]).not.toHaveProperty('intensity');

    // The toolbox keeps it in "what helps me", also after a reload
    await page.getByTestId('hub-toolbox').click();
    await expect(page.getByTestId('toolbox-mine').getByTestId(`strategy-${firstId}`)).toBeVisible();
    await page.reload();
    await page.getByTestId('emotions-button-leo').click();
    await page.getByTestId('hub-toolbox').click();
    await expect(page.getByTestId('toolbox-mine').getByTestId(`strategy-${firstId}`)).toBeVisible();
    // No reward for feelings
    await expect(page.getByTestId('reward-reveal')).toHaveCount(0);
  });

  test('older children see more feelings and say how strong it is; a pleasant feeling is savoured', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('emotions-button-leo').waitFor();
    await setLeoAge(page, 7);
    await page.getByTestId('emotions-button-leo').click();
    await page.getByTestId('hub-checkin').click();
    await expect(page.getByTestId('checkin-emotions').getByRole('button')).toHaveCount(12);
    await page.getByTestId('emotions-close').click();

    await setLeoAge(page, 10);
    await page.getByTestId('emotions-button-leo').click();
    await page.getByTestId('hub-checkin').click();
    await expect(page.getByTestId('checkin-emotions').getByRole('button')).toHaveCount(24);
    await page.getByTestId('emotion-pride').click();
    await page.getByTestId('checkin-next').click();
    await page.getByTestId('intensity-3').click();
    await page.getByTestId('checkin-next').click();
    await page.getByTestId('checkin-skip').click();
    const reply = page.getByTestId('checkin-response');
    await expect(reply).toHaveAttribute('data-pleasant', 'true');
    await expect(reply).toContainText('Raconte-le à quelqu’un');
    await expect(page.getByTestId('checkin-calm')).toHaveCount(0);

    const logs = await emotionLogs(page);
    expect(logs[0]).toMatchObject({ emotionId: 'pride', intensity: 3 });
    expect(logs[0]).not.toHaveProperty('bodyZones');
  });

  test('the calm corner can be opened from the emotions space, for that child', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('emotions-button-leo').click();
    await page.getByTestId('hub-calm').click();
    await expect(page.getByTestId('emotions-hub')).toHaveCount(0);
    await expect(page.getByTestId('calm-corner')).toBeVisible();
  });

  test('when bedtime is done, the board offers "how I feel" once; "not tonight" is remembered', async ({ page }) => {
    await page.goto('/');
    await keepOnlyTasks(page, ['lights_off']);
    await page.getByTestId('child-card-leo').click();
    await expect(page.getByTestId('evening-invite')).toHaveCount(0); // not before bedtime is done
    await completeTask(page, 'Éteindre la lumière', { dismiss: false });
    await expect(page.getByText('Tu as terminé toute ta journée', { exact: false })).toBeVisible();

    await page.goto('/');
    await page.getByTestId('child-card-leo').click();
    const invite = page.getByTestId('evening-invite');
    await expect(invite).toBeVisible();
    await page.getByTestId('evening-invite-later').click();
    await expect(invite).toHaveCount(0);
    await page.reload();
    await page.getByTestId('child-card-leo').click();
    await expect(page.locator('main')).toBeVisible();
    await expect(invite).toHaveCount(0);

    // Emma: going opens the check-in directly; once done, no more invitation
    await page.locator('header').getByRole('button').first().click();
    await page.getByTestId('child-card-emma').click();
    await completeTask(page, 'Éteindre la lumière', { dismiss: false });
    await page.goto('/');
    await page.getByTestId('child-card-emma').click();
    await page.getByTestId('evening-invite-go').click();
    await expect(page.getByTestId('emotions-hub')).toHaveAttribute('data-screen', 'checkin');
    await page.getByTestId('emotion-joy').click();
    await page.getByTestId('emotions-close').click();
    await expect(page.getByTestId('evening-invite')).toHaveCount(0);
  });
});

test('the emotions space fits a phone screen, even with 24 feelings', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 760 });
  await page.goto('/');
  await page.getByTestId('emotions-button-leo').waitFor();
  await setLeoAge(page, 10);
  await page.getByTestId('emotions-button-leo').click();
  await page.getByTestId('hub-checkin').click();
  await expect(page.getByTestId('checkin-emotions').getByRole('button')).toHaveCount(24);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  await page.getByTestId('emotion-discouragement').click();
  await expect(page.getByTestId('checkin-next')).toBeEnabled();
});
