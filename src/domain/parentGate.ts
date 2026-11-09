/**
 * Rules guarding Parent Mode: PIN attempts with a short lock-out, and the
 * "forgot the PIN" grown-up question (a multiplication young children can't solve).
 */

export const MAX_PIN_ATTEMPTS = 3;
export const PIN_LOCK_MS = 30_000;

export interface PinGuard {
  failures: number;
  lockedUntil: number; // epoch, 0 when not locked
}

export const OPEN_GUARD: PinGuard = { failures: 0, lockedUntil: 0 };

export function isLocked(guard: PinGuard, now: number): boolean {
  return guard.lockedUntil > now;
}

/** Seconds left before the next attempt is allowed (0 when not locked). */
export function lockSecondsLeft(guard: PinGuard, now: number): number {
  return isLocked(guard, now) ? Math.ceil((guard.lockedUntil - now) / 1000) : 0;
}

/** A wrong PIN or answer: after MAX_PIN_ATTEMPTS in a row, locks for PIN_LOCK_MS. */
export function afterFailure(guard: PinGuard, now: number): PinGuard {
  const failures = guard.failures + 1;
  return failures >= MAX_PIN_ATTEMPTS
    ? { failures: 0, lockedUntil: now + PIN_LOCK_MS }
    : { failures, lockedUntil: guard.lockedUntil };
}

export interface GrownUpChallenge {
  a: number;
  b: number;
  answer: number;
}

/** Two-digit × one-digit multiplication, e.g. 14 × 7. */
export function makeChallenge(random: () => number = Math.random): GrownUpChallenge {
  const a = 11 + Math.floor(random() * 9); // 11–19
  const b = 3 + Math.floor(random() * 7); // 3–9
  return { a, b, answer: a * b };
}

export function isValidPin(pin: string): boolean {
  return /^\d{4}$/.test(pin);
}
