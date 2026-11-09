import { describe, it, expect } from 'vitest';
import { ChildProfile } from '../domain/models';
import { cardsOn, giveCard, recentCards, withdrawCard } from '../domain/cards';
import { parseBackup } from '../domain/backup';

const DATE = '2026-11-09';
const leo: ChildProfile = { id: 'leo', name: 'Léo', avatar: '🦊', color: 'indigo', stars: 10, starProgress: 2, medalCount: 3 };

describe('Yellow and red cards', () => {
  it('a yellow card is a warning without effect on rewards', () => {
    const { profile, outcome, lostProgress } = giveCard(leo, 'yellow', DATE, 1000, ' Dispute ');
    expect(outcome).toBe('yellow');
    expect(lostProgress).toBe(0);
    expect(profile.starProgress).toBe(2);
    expect(profile.cards).toHaveLength(1);
    expect(profile.cards![0]).toMatchObject({ color: 'yellow', date: DATE, reason: 'Dispute' });
  });

  it('a red card resets the progress toward the next medal, never medals or stars', () => {
    const { profile, outcome, lostProgress } = giveCard(leo, 'red', DATE, 1000);
    expect(outcome).toBe('red');
    expect(lostProgress).toBe(2);
    expect(profile).toMatchObject({ starProgress: 0, stars: 10, medalCount: 3 });
    expect(profile.cards![0]).toMatchObject({ color: 'red', lostProgress: 2 });
  });

  it('a second yellow the same evening becomes a red', () => {
    const first = giveCard(leo, 'yellow', DATE, 1000).profile;
    const second = giveCard(first, 'yellow', DATE, 2000);
    expect(second.outcome).toBe('second_yellow');
    expect(second.profile.starProgress).toBe(0);
    expect(cardsOn(second.profile, DATE)).toMatchObject({ yellow: 2, red: 1 });
    expect(second.profile.cards![second.profile.cards!.length - 1]).toMatchObject({ color: 'red', fromYellows: true, lostProgress: 2 });
    // A third yellow does not add another automatic red
    const third = giveCard(second.profile, 'yellow', DATE, 3000);
    expect(third.outcome).toBe('yellow');
    expect(cardsOn(third.profile, DATE)).toMatchObject({ yellow: 3, red: 1 });
  });

  it('each evening starts clean, but the history is kept', () => {
    const yesterday = giveCard(leo, 'yellow', '2026-11-08', 1000).profile;
    const today = giveCard(yesterday, 'yellow', DATE, 2000);
    expect(today.outcome).toBe('yellow');
    expect(cardsOn(today.profile, DATE)).toMatchObject({ yellow: 1, red: 0 });
    expect(today.profile.cards).toHaveLength(2);
  });

  it('withdrawing a card given by mistake gives the stars back', () => {
    const red = giveCard(leo, 'red', DATE, 1000).profile;
    const restored = withdrawCard(red, red.cards![0].id, 3);
    expect(restored).toMatchObject({ starProgress: 2, cards: [] });

    // Withdrawing the second yellow also withdraws the red it triggered
    const twoYellows = giveCard(giveCard(leo, 'yellow', DATE, 1000).profile, 'yellow', DATE, 2000).profile;
    const secondYellow = twoYellows.cards![1];
    const back = withdrawCard(twoYellows, secondYellow.id, 3);
    expect(back.starProgress).toBe(2);
    expect(back.cards!.map((c) => c.color)).toEqual(['yellow']);
  });

  it('restored stars never complete a medal by themselves', () => {
    const red = giveCard(leo, 'red', DATE, 1000).profile;
    const meanwhile = { ...red, starProgress: 2 }; // stars earned again since
    expect(withdrawCard(meanwhile, red.cards![0].id, 3).starProgress).toBe(2);
  });

  it('lists recent cards of every child, newest first, and keeps them in backups', () => {
    const a = giveCard(leo, 'yellow', DATE, 1000).profile;
    const emma = giveCard({ ...leo, id: 'emma', name: 'Emma' }, 'red', DATE, 2000).profile;
    expect(recentCards([a, emma]).map((c) => `${c.childId}:${c.color}`)).toEqual(['emma:red', 'leo:yellow']);

    const file = JSON.stringify({
      app: 'kidu',
      version: 1,
      data: { settings: { parentPin: '1234', language: 'fr', rewards: { starsPerCompletion: 1, weeklyGoal: 5 } }, tasks: [], profiles: [emma] },
    });
    expect(parseBackup(file).data.profiles[0].cards).toEqual(emma.cards);
    expect(() => parseBackup(file.replace('"red"', '"green"'))).toThrow();
  });
});
