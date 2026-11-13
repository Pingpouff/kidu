import { describe, it, expect } from 'vitest';

/** Source of every .ts / .tsx file of the app (tests excluded), by path */
const sources = import.meta.glob(['../**/*.{ts,tsx}', '!../tests/**'], {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

describe('Screen heights', () => {
  it('never use a bare dvh class: Chrome < 108 (old tablets) ignores it and nothing can scroll', () => {
    expect(Object.keys(sources).length).toBeGreaterThan(50);
    const offenders = Object.entries(sources)
      .filter(([, code]) => /\d+dvh/.test(code))
      .map(([path]) => path);
    // Use .screen-h / .screen-max-h-* (index.css): vh first, then dvh
    expect(offenders).toEqual([]);
  });
});
