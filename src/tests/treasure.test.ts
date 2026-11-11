import { describe, it, expect } from 'vitest';
import { ChildProfile } from '../domain/models';
import { collectionProgress, treasureItems, treasureRank, treasureStats } from '../domain/treasure';
import { BADGES } from '../domain/badges';

const base: ChildProfile = { id: 'leo', name: 'Léo', avatar: '🦊', color: 'indigo', stars: 12, medalCount: 4 };

const profile: ChildProfile = {
  ...base,
  badges: [
    { uid: '1', badgeId: 'dinosaurs.trex', earnedAt: 10 },
    { uid: '2', badgeId: 'space.rocket', earnedAt: 20, spentAt: 25, spentOn: 'Glace' },
    { uid: '3', badgeId: 'dinosaurs.trex', earnedAt: 30 },
    { uid: '4', badgeId: 'unknown.badge', earnedAt: 40 },
  ],
  trophies: [
    { id: 'first_step', earnedAt: 5 },
    { id: 'first_routine', earnedAt: 15 },
  ],
};

describe('Treasure view', () => {
  it('lists trophies first, then one entry per badge with copies counted', () => {
    const items = treasureItems(profile);
    expect(items.map((i) => i.key)).toEqual([
      'trophy:first_routine',
      'trophy:first_step',
      'badge:dinosaurs.trex',
      'badge:space.rocket',
    ]);
    const trex = items[2];
    expect(trex).toMatchObject({ kind: 'badge', count: 2, available: 2, earnedAt: 30, spentOn: [] });
    expect(items[3]).toMatchObject({ kind: 'badge', count: 1, available: 0, spentOn: ['Glace'] });
  });

  it('is empty for a new child', () => {
    expect(treasureItems(base)).toEqual([]);
    expect(treasureStats(base)).toMatchObject({ badges: 0, trophies: 0, collectionsComplete: 0 });
  });

  it('tracks collections per universe, most advanced first', () => {
    const progress = collectionProgress(profile);
    expect(progress).toHaveLength(10);
    expect(progress[0].universe).toBe('dinosaurs');
    expect([...progress[0].owned]).toEqual(['dinosaurs.trex']);
    expect(progress[1].universe).toBe('space');
    expect(progress[2].owned.size).toBe(0);
    expect(progress.every((c) => c.badgeIds.length === 6 && !c.complete)).toBe(true);
  });

  it('counts complete collections and grows the rank', () => {
    const dinos = BADGES.filter((b) => b.universe === 'dinosaurs');
    const collector: ChildProfile = {
      ...base,
      badges: dinos.map((b, i) => ({ uid: String(i), badgeId: b.id, earnedAt: i })),
    };
    const stats = treasureStats(collector);
    expect(stats).toMatchObject({ badges: 6, distinctBadges: 6, collectionsComplete: 1, stars: 12, medals: 4 });
    expect(collectionProgress(collector)[0].complete).toBe(true);
    expect(treasureRank(stats)).toBe('hunter'); // 6 + 5 = 11
    expect(treasureRank(treasureStats(base))).toBe('explorer');
    expect(treasureRank({ ...stats, badges: 40 })).toBe('legend');
  });
});

describe('Treasure — trophies and medals apart', () => {
  it('shows every trophy of the catalog, earned or still to win', async () => {
    const { trophyShowcase } = await import('../domain/treasure');
    const { TROPHY_IDS } = await import('../domain/trophies');
    const showcase = trophyShowcase({ id: 'leo', name: 'Léo', avatar: '🦊', color: 'indigo', stars: 0, trophies: [{ id: 'weekend', earnedAt: 5 }] });
    expect(showcase.map((t) => t.id)).toEqual([...TROPHY_IDS]);
    expect(showcase.length).toBe(23);
    expect(showcase.find((t) => t.id === 'weekend')).toMatchObject({ earnedAt: 5 });
    expect(showcase.find((t) => t.id === 'first_step')).not.toHaveProperty('earnedAt');
  });

  it('counts medals won, in the piggy bank and exchanged', async () => {
    const { medalTotals } = await import('../domain/treasure');
    expect(
      medalTotals({
        id: 'leo', name: 'Léo', avatar: '🦊', color: 'indigo', stars: 9,
        badges: [
          { uid: 'a', badgeId: 'trex', earnedAt: 1 },
          { uid: 'b', badgeId: 'trex', earnedAt: 2, spentAt: 3, spentOn: 'Dessert' },
          { uid: 'c', badgeId: 'rocket', earnedAt: 4 },
        ],
      })
    ).toEqual({ total: 3, inBank: 2, spent: 1 });
  });
});
