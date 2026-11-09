import { ChildProfile } from './models';
import { BADGES, getBadge, getUniverse, UNIVERSES, UniverseId } from './badges';
import { TROPHY_ICONS, TrophyId } from './trophies';

/**
 * "My treasure": a big, animated showcase of everything a child has won.
 * Pure helpers that turn a profile into what the treasure view displays.
 */

export type TreasureItem =
  | {
      kind: 'trophy';
      key: string;
      trophyId: TrophyId;
      icon: string;
      earnedAt: number;
    }
  | {
      kind: 'badge';
      key: string;
      badgeId: string;
      icon: string;
      universe: UniverseId;
      earnedAt: number; // most recent copy
      count: number; // copies ever won
      available: number; // copies still in the piggy bank
      spentOn: string[]; // rewards bought with spent copies
    };

export interface CollectionProgress {
  universe: UniverseId;
  /** Badge ids of this universe, in catalog order */
  badgeIds: string[];
  owned: Set<string>;
  complete: boolean;
}

export interface TreasureStats {
  stars: number;
  medals: number;
  badges: number; // copies ever won
  distinctBadges: number;
  trophies: number;
  collectionsComplete: number;
}

export const TREASURE_RANKS = ['explorer', 'hunter', 'adventurer', 'legend'] as const;
export type TreasureRank = typeof TREASURE_RANKS[number];
export const RANK_ICONS: Record<TreasureRank, string> = {
  explorer: '🧭',
  hunter: '🗺️',
  adventurer: '⚔️',
  legend: '👑',
};

/**
 * Items to show, most precious first: trophies, then badges (one entry per
 * badge kind, duplicates counted), newest first inside each group.
 */
export function treasureItems(profile: ChildProfile): TreasureItem[] {
  const trophies: TreasureItem[] = [...(profile.trophies ?? [])]
    .filter((t) => t.id in TROPHY_ICONS)
    .sort((a, b) => b.earnedAt - a.earnedAt)
    .map((t) => ({ kind: 'trophy', key: `trophy:${t.id}`, trophyId: t.id, icon: TROPHY_ICONS[t.id], earnedAt: t.earnedAt }));

  const byBadge = new Map<string, Extract<TreasureItem, { kind: 'badge' }>>();
  for (const owned of profile.badges ?? []) {
    const badge = getBadge(owned.badgeId);
    if (!badge) continue;
    let item = byBadge.get(badge.id);
    if (!item) {
      item = {
        kind: 'badge',
        key: `badge:${badge.id}`,
        badgeId: badge.id,
        icon: badge.emoji,
        universe: badge.universe,
        earnedAt: owned.earnedAt,
        count: 0,
        available: 0,
        spentOn: [],
      };
      byBadge.set(badge.id, item);
    }
    item.count++;
    item.earnedAt = Math.max(item.earnedAt, owned.earnedAt);
    if (owned.spentAt) {
      if (owned.spentOn) item.spentOn.push(owned.spentOn);
    } else {
      item.available++;
    }
  }
  const badges = [...byBadge.values()].sort((a, b) => b.earnedAt - a.earnedAt);
  return [...trophies, ...badges];
}

/**
 * Collection progress per universe: universes with badges first (most owned
 * first), then the untouched ones, in catalog order.
 */
export function collectionProgress(profile: ChildProfile): CollectionProgress[] {
  const ownedIds = new Set((profile.badges ?? []).map((b) => b.badgeId));
  return UNIVERSES.map((u, index) => {
    const badgeIds = BADGES.filter((b) => b.universe === u.id).map((b) => b.id);
    const owned = new Set(badgeIds.filter((id) => ownedIds.has(id)));
    return { universe: u.id, badgeIds, owned, complete: owned.size === badgeIds.length, index };
  })
    .sort((a, b) => b.owned.size - a.owned.size || a.index - b.index)
    .map(({ universe, badgeIds, owned, complete }) => ({ universe, badgeIds, owned, complete }));
}

export function treasureStats(profile: ChildProfile): TreasureStats {
  const badges = profile.badges ?? [];
  return {
    stars: profile.stars ?? 0,
    medals: profile.medalCount ?? 0,
    badges: badges.length,
    distinctBadges: new Set(badges.map((b) => b.badgeId).filter((id) => getBadge(id))).size,
    trophies: (profile.trophies ?? []).length,
    collectionsComplete: collectionProgress(profile).filter((c) => c.complete).length,
  };
}

/** A fun title that grows with the treasure: badges + 2 per trophy + 5 per complete collection. */
export function treasureRank(stats: TreasureStats): TreasureRank {
  const score = stats.badges + stats.trophies * 2 + stats.collectionsComplete * 5;
  if (score >= 40) return 'legend';
  if (score >= 20) return 'adventurer';
  if (score >= 8) return 'hunter';
  return 'explorer';
}

/** Gradient of an item's disc. */
export function itemGradient(item: TreasureItem): string {
  return item.kind === 'badge' ? getUniverse(item.universe).gradient : 'from-yellow-300 via-amber-400 to-yellow-600';
}
