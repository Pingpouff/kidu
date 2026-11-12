import { test as base, expect } from '@playwright/test';

/**
 * Default tasks for school (school bag, homework) only exist Monday to Friday.
 * When the suite runs on a weekend, the browser clock is moved back to Friday
 * (same time of day) so every spec sees a school day. Weekdays are untouched.
 */
export const test = base.extend<{ schoolDay: void; notificationOffer: boolean; quietOffer: void }>({
  // The "turn on notifications?" offer (after saving a timed task) is answered
  // up front, so it doesn't pop over other specs. Opt in with test.use({ notificationOffer: true }).
  notificationOffer: [false, { option: true }],
  quietOffer: [
    async ({ page, notificationOffer }, use) => {
      if (!notificationOffer) await page.addInitScript(() => localStorage.setItem('kidu.notificationOfferDismissed', '1'));
      await use();
    },
    { auto: true },
  ],
  schoolDay: [
    async ({ page }, use) => {
      const now = new Date();
      const day = now.getDay();
      if (day === 0 || day === 6) {
        const friday = new Date(now);
        friday.setDate(now.getDate() - (day === 6 ? 1 : 2));
        await page.clock.install({ time: friday });
      }
      await use();
    },
    { auto: true },
  ],
});

export { expect };
