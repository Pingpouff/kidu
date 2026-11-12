import { BehaviorCard, CardColor, ChildProfile } from './models';
import { addStars } from './rewards';

/**
 * Green, yellow and red cards (pure rules).
 * - Green: a "well done" for a kind or brave gesture, one star toward the next
 *   medal (it can complete a medal).
 * - Yellow: a warning, no effect on rewards.
 * - Red: the stars collected toward the next medal go back to zero.
 *   Medals, badges and trophies already won are never taken away.
 * - A second yellow the same evening automatically adds a red.
 * - Cards count per evening: the next evening starts clean (history is kept).
 */

export interface CardsTonight {
  green: number;
  yellow: number;
  red: number;
  cards: BehaviorCard[];
}

/** What the child got tonight, for the reminders on screen (banner, frame, home card…). */
export interface TonightCardState {
  /** The most serious card of the evening: a red outranks yellows (green cards don't count) */
  level: 'none' | 'yellow' | 'red';
  green: number;
  yellow: number;
  red: number;
  /** Reason of the last yellow / red card given tonight, if any */
  lastReason?: string;
  /** Reason of the last green card given tonight, if any */
  lastGreenReason?: string;
  /** Stars toward the next medal taken away tonight by red cards */
  lostProgress: number;
}

export function tonightCardState(profile: ChildProfile, date: string): TonightCardState {
  const { cards, green, yellow, red } = cardsOn(profile, date);
  const lastReason = [...cards].reverse().find((c) => c.color !== 'green' && c.reason)?.reason;
  const lastGreenReason = [...cards].reverse().find((c) => c.color === 'green' && c.reason)?.reason;
  return {
    level: red > 0 ? 'red' : yellow > 0 ? 'yellow' : 'none',
    green,
    yellow,
    red,
    ...(lastReason ? { lastReason } : {}),
    ...(lastGreenReason ? { lastGreenReason } : {}),
    lostProgress: cards.reduce((sum, c) => sum + (c.lostProgress ?? 0), 0),
  };
}

/** What happened when a card was given (drives the referee animation). */
export type CardOutcome = 'green' | 'yellow' | 'second_yellow' | 'red';

export function cardsOn(profile: ChildProfile, date: string): CardsTonight {
  const cards = (profile.cards ?? []).filter((c) => c.date === date).sort((a, b) => a.givenAt - b.givenAt);
  return {
    cards,
    green: cards.filter((c) => c.color === 'green').length,
    yellow: cards.filter((c) => c.color === 'yellow').length,
    red: cards.filter((c) => c.color === 'red').length,
  };
}

const newId = (now: number, suffix: string) => `card_${now.toString(36)}_${suffix}_${Math.random().toString(36).slice(2, 6)}`;

/** Applies the red card penalty: progress toward the next medal goes back to zero. */
function redCard(profile: ChildProfile, base: Omit<BehaviorCard, 'id' | 'color' | 'lostProgress'>, now: number): { card: BehaviorCard; profile: ChildProfile } {
  const lostProgress = profile.starProgress ?? 0;
  return {
    card: { ...base, id: newId(now, 'red'), color: 'red', ...(lostProgress > 0 ? { lostProgress } : {}) },
    profile: { ...profile, starProgress: 0 },
  };
}

export function giveCard(
  profile: ChildProfile,
  color: CardColor,
  date: string,
  now: number,
  reason?: string,
  starsPerMedal = 3
): { profile: ChildProfile; outcome: CardOutcome; lostProgress: number; medalsGained: number; added: BehaviorCard[] } {
  const base = { date, givenAt: now, ...(reason?.trim() ? { reason: reason.trim() } : {}) };
  const tonight = cardsOn(profile, date);

  if (color === 'green') {
    const green: BehaviorCard = { ...base, id: newId(now, 'green'), color: 'green', gainedStar: true };
    const { profile: rewarded, medalsGained } = addStars(profile, 1, Math.max(1, starsPerMedal));
    return {
      profile: { ...rewarded, cards: [...(profile.cards ?? []), green] },
      outcome: 'green',
      lostProgress: 0,
      medalsGained,
      added: [green],
    };
  }

  if (color === 'yellow') {
    const yellow: BehaviorCard = { ...base, id: newId(now, 'yellow'), color: 'yellow' };
    // Second yellow of the evening (and no red yet): it becomes a red
    if (tonight.yellow === 1 && tonight.red === 0) {
      const red = redCard(profile, { ...base, givenAt: now + 1, fromYellows: true }, now + 1);
      return {
        profile: { ...red.profile, cards: [...(profile.cards ?? []), yellow, red.card] },
        outcome: 'second_yellow',
        lostProgress: red.card.lostProgress ?? 0,
        medalsGained: 0,
        added: [yellow, red.card],
      };
    }
    return { profile: { ...profile, cards: [...(profile.cards ?? []), yellow] }, outcome: 'yellow', lostProgress: 0, medalsGained: 0, added: [yellow] };
  }

  const red = redCard(profile, base, now);
  return {
    profile: { ...red.profile, cards: [...(profile.cards ?? []), red.card] },
    outcome: 'red',
    lostProgress: red.card.lostProgress ?? 0,
    medalsGained: 0,
    added: [red.card],
  };
}

/**
 * Withdraws a card given by mistake. Withdrawing a red gives back the stars it
 * took (up to just below a medal); withdrawing a yellow also withdraws the red
 * it triggered, if any. Withdrawing a green takes its star back (a medal it
 * completed is kept: the child already chose it).
 */
export function withdrawCard(profile: ChildProfile, cardId: string, starsPerMedal: number): ChildProfile {
  const cards = profile.cards ?? [];
  const card = cards.find((c) => c.id === cardId);
  if (!card) return profile;

  if (card.color === 'green') {
    return {
      ...profile,
      cards: cards.filter((c) => c.id !== cardId),
      ...(card.gainedStar
        ? { stars: Math.max(0, profile.stars - 1), starProgress: Math.max(0, (profile.starProgress ?? 0) - 1) }
        : {}),
    };
  }

  let removed = [card];
  if (card.color === 'yellow') {
    // The automatic red that followed this yellow goes too
    const sameEvening = cards.filter((c) => c.date === card.date).sort((a, b) => a.givenAt - b.givenAt);
    const autoRed = sameEvening.find((c) => c.fromYellows && c.givenAt > card.givenAt);
    if (autoRed) removed = [card, autoRed];
  }
  const restored = removed.reduce((sum, c) => sum + (c.lostProgress ?? 0), 0);
  const ids = new Set(removed.map((c) => c.id));
  return {
    ...profile,
    cards: cards.filter((c) => !ids.has(c.id)),
    starProgress: Math.min(Math.max(1, starsPerMedal) - 1, (profile.starProgress ?? 0) + restored),
  };
}

/** Cards of every child, newest first (Parent Mode history). */
export function recentCards(profiles: ChildProfile[], limit = 30): (BehaviorCard & { childId: string })[] {
  return profiles
    .flatMap((p) => (p.cards ?? []).map((c) => ({ ...c, childId: p.id })))
    .sort((a, b) => b.givenAt - a.givenAt)
    .slice(0, limit);
}

/** Suggested reasons for a green card, as translation keys (`cards.reason.<id>`). */
export const GREEN_CARD_REASONS = ['helped', 'kind', 'shared', 'calmed_down', 'listened', 'brave'] as const;

/** Suggested reasons for a yellow / red card, as translation keys (`cards.reason.<id>`). */
export const CARD_REASONS = ['fight', 'not_listening', 'bad_words', 'tantrum', 'rude', 'dangerous'] as const;
