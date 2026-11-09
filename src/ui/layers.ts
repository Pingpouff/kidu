/**
 * Stacking order of full-screen layers. CSS classes come from the `zIndex`
 * tokens of tailwind.config.js; confetti (drawn on a canvas by JS) uses these numbers.
 */
export const LAYER = {
  overlay: 'z-overlay',
  treasure: 'z-treasure',
  flying: 'z-flying',
  banner: 'z-banner',
  dialog: 'z-dialog',
  choice: 'z-choice',
  reveal: 'z-reveal',
} as const;

export type Layer = keyof typeof LAYER;

/** Confetti canvases sit above every layer. */
export const CONFETTI_Z = { board: 60, celebration: 100, overlay: 120, top: 130 } as const;
