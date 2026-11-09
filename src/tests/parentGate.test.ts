import { describe, it, expect } from 'vitest';
import {
  afterFailure,
  isLocked,
  isValidPin,
  lockSecondsLeft,
  makeChallenge,
  MAX_PIN_ATTEMPTS,
  OPEN_GUARD,
  PIN_LOCK_MS,
} from '../domain/parentGate';
import { greetingKey } from '../domain/summary';
import { translate, translateDynamic } from '../i18n/dictionary';

describe('Parent gate', () => {
  it('locks after 3 wrong attempts in a row, for 30 s', () => {
    let guard = OPEN_GUARD;
    for (let i = 0; i < MAX_PIN_ATTEMPTS - 1; i++) guard = afterFailure(guard, 1000);
    expect(isLocked(guard, 1000)).toBe(false);
    guard = afterFailure(guard, 1000);
    expect(isLocked(guard, 1000)).toBe(true);
    expect(lockSecondsLeft(guard, 1000)).toBe(PIN_LOCK_MS / 1000);
    expect(isLocked(guard, 1000 + PIN_LOCK_MS)).toBe(false);
    expect(guard.failures).toBe(0); // a fresh series of attempts after the wait
  });

  it('asks a two-digit multiplication', () => {
    const low = makeChallenge(() => 0);
    const high = makeChallenge(() => 0.999);
    expect(low).toEqual({ a: 11, b: 3, answer: 33 });
    expect(high).toEqual({ a: 19, b: 9, answer: 171 });
  });

  it('only accepts 4-digit PINs', () => {
    expect(isValidPin('0420')).toBe(true);
    for (const pin of ['123', '12345', ' 123', '1e01', '12a4', '']) expect(isValidPin(pin)).toBe(false);
  });
});

describe('Wording', () => {
  it('greets according to the time of day', () => {
    expect(greetingKey(7)).toBe('home.greeting.morning');
    expect(greetingKey(14)).toBe('home.greeting.afternoon');
    expect(greetingKey(19)).toBe('home.greeting.evening');
    expect(greetingKey(2)).toBe('home.greeting.evening');
  });

  it('fills {placeholders} and falls back to the key for unknown dynamic keys', () => {
    expect(translate('badge.choose_spoken', 'fr', { name: 'Léo' })).toBe('Léo, choisis ton badge !');
    expect(translate('piggy.bought_spoken', 'en', { item: 'Ice cream' })).toBe('Hooray! Ice cream!');
    expect(translateDynamic('category.morning', 'fr')).toBe('Matin');
    expect(translateDynamic('nope.missing', 'fr')).toBe('nope.missing');
  });
});
