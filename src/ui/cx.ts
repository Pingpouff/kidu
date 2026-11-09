import { extendTailwindMerge } from 'tailwind-merge';

// Knows the custom z-index tokens of tailwind.config.js, so `z-dialog` replaces `z-overlay`
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      z: [{ z: ['overlay', 'treasure', 'flying', 'banner', 'dialog', 'choice', 'reveal'] }],
    },
  },
});

type ClassValue = string | false | null | undefined | 0;

/**
 * Joins class names, skipping falsy values; when two classes set the same
 * property, the last one wins: cx('px-4 py-2', 'px-2') → 'py-2 px-2'.
 */
export function cx(...classes: ClassValue[]): string {
  return twMerge(classes.filter(Boolean).join(' '));
}
