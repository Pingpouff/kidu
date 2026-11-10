import type confetti from 'canvas-confetti';
import { reminderService } from './ReminderService';
import { liteVisuals } from './performance';

/**
 * True when rich animations are allowed: the parent hasn't chosen
 * "reduced" animations and the device doesn't ask for reduced motion.
 */
export function richMotion(): boolean {
  if (reminderService.feedback.animations === 'reduced') return false;
  if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
    return false;
  }
  return true;
}

/**
 * Confetti, only when rich animations are allowed.
 */
export function fireConfetti(options: confetti.Options) {
  if (!richMotion()) return;
  // Lite display (weak devices): a third of the particles
  const particleCount = liteVisuals() ? Math.max(10, Math.round((options.particleCount ?? 50) / 3)) : options.particleCount;
  // Loaded on first use, kept out of the startup bundle
  import('canvas-confetti').then(({ default: fire }) =>
    fire({ disableForReducedMotion: true, ...options, ...(particleCount !== undefined ? { particleCount } : {}) })
  );
}
