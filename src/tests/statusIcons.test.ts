import { describe, it, expect } from 'vitest';
import { STATUS_ICONS, TIME_ICONS } from '../ui/statusIcons';
import { CATEGORY_ICONS } from '../domain/models';

/**
 * Status, time and phase pictures carry meaning for children who can't read
 * yet: one picture = one meaning, everywhere in the app.
 */
describe('Pictures as meaning for children', () => {
  it('never gives two meanings to the same picture', () => {
    const all = [...Object.values(STATUS_ICONS), ...Object.values(TIME_ICONS), ...Object.values(CATEGORY_ICONS)];
    expect(new Set(all).size).toBe(all.length);
  });
});
