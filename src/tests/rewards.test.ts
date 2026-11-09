import { describe, it, expect } from 'vitest';
import { ChildProfile, RoutineSession, ShopItem, TaskStatus } from '../domain/models';
import { applyTaskRewards, chooseBadge, spendBadges, unspentBadges, starsPerMedal, shopItems } from '../domain/rewards';
import { BADGES, drawBadgeOffer, getBadge } from '../domain/badges';
import { resetSession, syncSessionWithDefinitions } from '../domain/routine';

const profile: ChildProfile = { id: 'leo', name: 'Léo', avatar: '🦊', color: 'indigo', stars: 0 };

const sessionWith = (statuses: TaskStatus[], rewarded: boolean[] = []): RoutineSession => ({
  id: '2026-11-09_leo',
  childId: 'leo',
  date: '2026-11-09',
  isCompleted: false,
  tasks: statuses.map((status, i) => ({
    id: `t${i}`,
    definitionId: `d${i}`,
    status,
    ...(rewarded[i] ? { rewarded: true } : {}),
  })),
});

// Deterministic pseudo-random generator for offers
const seeded = (seed = 42) => () => {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
};

describe('Stars and medals', () => {
  it('gives one star per newly completed task and marks it as rewarded', () => {
    const result = applyTaskRewards(sessionWith(['done', 'doing', 'todo']), profile, 3);
    expect(result.starsGained).toBe(1);
    expect(result.medalsGained).toBe(0);
    expect(result.profile.stars).toBe(1);
    expect(result.profile.starProgress).toBe(1);
    expect(result.session.tasks[0].rewarded).toBe(true);
    expect(result.session.tasks[1].rewarded).toBeUndefined();
  });

  it('never rewards the same task twice (undo / redo)', () => {
    const first = applyTaskRewards(sessionWith(['done']), profile, 3);
    const undone = { ...first.session, tasks: first.session.tasks.map((t) => ({ ...t, status: 'todo' as TaskStatus })) };
    const redone = { ...undone, tasks: undone.tasks.map((t) => ({ ...t, status: 'done' as TaskStatus })) };
    const second = applyTaskRewards(redone, first.profile, 3);
    expect(second.starsGained).toBe(0);
    expect(second.profile.stars).toBe(1);
  });

  it('turns every 3 stars into a medal with a 3-badge offer', () => {
    const start = { ...profile, stars: 2, starProgress: 2 };
    const result = applyTaskRewards(sessionWith(['done']), start, 3, seeded());
    expect(result.medalsGained).toBe(1);
    expect(result.profile.starProgress).toBe(0);
    expect(result.profile.medalCount).toBe(1);
    expect(result.profile.badgeOffers).toHaveLength(1);
    expect(result.profile.badgeOffers![0]).toHaveLength(3);
  });

  it('handles several medals at once and respects a custom stars-per-medal setting', () => {
    const result = applyTaskRewards(sessionWith(['done', 'done', 'done', 'done', 'done']), profile, 2, seeded());
    expect(result.medalsGained).toBe(2);
    expect(result.profile.starProgress).toBe(1);
    expect(result.profile.badgeOffers).toHaveLength(2);
  });

  it('keeps the rewarded mark through a session reset and a task-list sync', () => {
    const rewarded = sessionWith(['done'], [true]);
    expect(resetSession(rewarded).tasks[0].rewarded).toBe(true);
    const synced = syncSessionWithDefinitions(rewarded, [
      { id: 'd0', labelKey: '', defaultLabel: 'x', icon: 'x', order: 1 },
    ]);
    expect(synced.tasks[0].rewarded).toBe(true);
  });

  it('defaults to 3 stars per medal and the default shop', () => {
    expect(starsPerMedal(undefined)).toBe(3);
    expect(shopItems(undefined).length).toBeGreaterThan(0);
    expect(shopItems({ parentPin: '1234', language: 'fr', rewards: { starsPerCompletion: 1, weeklyGoal: 5 }, shop: [] })).toEqual([]);
  });
});

describe('Badges', () => {
  it('offers 3 badges from 3 different universes', () => {
    const offer = drawBadgeOffer([], 3, seeded(7));
    expect(offer).toHaveLength(3);
    const universes = offer.map((id) => getBadge(id)!.universe);
    expect(new Set(universes).size).toBe(3);
  });

  it('prefers badges the child does not own yet', () => {
    const almostAll = BADGES.map((b) => b.id).filter((id) => !['space.rocket', 'ocean.whale', 'farm.cow'].includes(id));
    const offer = drawBadgeOffer(almostAll, 3, seeded(3));
    expect(offer.sort()).toEqual(['farm.cow', 'ocean.whale', 'space.rocket']);
  });

  it('puts the chosen badge in the piggy bank and consumes the offer', () => {
    const withOffer = { ...profile, badgeOffers: [['space.rocket', 'ocean.whale', 'farm.cow'], ['jungle.lion', 'sweets.donut', 'heroes.robot']] };
    const updated = chooseBadge(withOffer, 'ocean.whale', 1000, 'u1');
    expect(updated.badgeOffers).toEqual([['jungle.lion', 'sweets.donut', 'heroes.robot']]);
    expect(updated.badges).toEqual([{ uid: 'u1', badgeId: 'ocean.whale', earnedAt: 1000 }]);
    expect(() => chooseBadge(updated, 'ocean.whale')).toThrow();
  });
});

describe('Shop', () => {
  const item: ShopItem = { id: 'dessert', label: 'Choisir le dessert', icon: '🍨', cost: 2 };
  const rich: ChildProfile = {
    ...profile,
    badges: [
      { uid: 'b3', badgeId: 'farm.cow', earnedAt: 3 },
      { uid: 'b1', badgeId: 'space.rocket', earnedAt: 1 },
      { uid: 'b2', badgeId: 'ocean.whale', earnedAt: 2 },
    ],
  };

  it('spends the oldest badges and keeps them in the album', () => {
    const after = spendBadges(rich, item, 99);
    expect(unspentBadges(after).map((b) => b.uid)).toEqual(['b3']);
    expect(after.badges).toHaveLength(3);
    expect(after.badges!.find((b) => b.uid === 'b1')).toMatchObject({ spentAt: 99, spentOn: 'Choisir le dessert' });
  });

  it('refuses the exchange without enough badges', () => {
    expect(() => spendBadges(rich, { ...item, cost: 4 })).toThrow();
  });
});
