import confetti from 'canvas-confetti';
import { reminderService } from './ReminderService';

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
  confetti({ disableForReducedMotion: true, ...options });
}
