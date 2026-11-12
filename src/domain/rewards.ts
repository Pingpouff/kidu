import { ChildProfile, OwnedBadge, ParentSettings, RoutineSession, ShopItem } from './models';
import { drawBadgeOffer } from './badges';

export const DEFAULT_STARS_PER_MEDAL = 3;

export const starsPerMedal = (settings: ParentSettings | undefined): number =>
  Math.max(1, settings?.rewards.starsPerMedal ?? DEFAULT_STARS_PER_MEDAL);

export interface TaskRewardResult {
  session: RoutineSession;
  profile: ChildProfile;
  starsGained: number;
  medalsGained: number;
}

/**
 * Gives one star per newly completed task (only once per task and per day),
 * converts every `perMedal` stars into a medal, and queues a badge offer
 * (3 badges to choose from) for each medal.
 */
export function applyTaskRewards(
  session: RoutineSession,
  profile: ChildProfile,
  perMedal: number,
  random: () => number = Math.random
): TaskRewardResult {
  let starsGained = 0;
  const tasks = session.tasks.map((task) => {
    if (task.status === 'done' && !task.rewarded) {
      starsGained++;
      return { ...task, rewarded: true };
    }
    return task;
  });

  if (starsGained === 0) {
    return { session, profile, starsGained: 0, medalsGained: 0 };
  }

  const { profile: rewarded, medalsGained } = addStars(profile, starsGained, perMedal, random);
  return { session: { ...session, tasks }, profile: rewarded, starsGained, medalsGained };
}

/**
 * Adds stars to a child (tasks done, green card): every `perMedal` stars make a
 * medal, and each medal queues a choice of 3 motifs.
 */
export function addStars(
  profile: ChildProfile,
  count: number,
  perMedal: number,
  random: () => number = Math.random
): { profile: ChildProfile; medalsGained: number } {
  if (count <= 0) return { profile, medalsGained: 0 };
  const totalProgress = (profile.starProgress ?? 0) + count;
  const medalsGained = Math.floor(totalProgress / perMedal);

  const ownedIds = (profile.badges ?? []).map((b) => b.badgeId);
  const offers = [...(profile.badgeOffers ?? [])];
  for (let i = 0; i < medalsGained; i++) {
    // Avoid offering the same badges twice in a row
    const offer = drawBadgeOffer([...ownedIds, ...offers.flat()], 3, random);
    offers.push(offer);
  }

  return {
    profile: {
      ...profile,
      stars: profile.stars + count,
      starProgress: totalProgress % perMedal,
      medalCount: (profile.medalCount ?? 0) + medalsGained,
      badgeOffers: offers,
    },
    medalsGained,
  };
}

/**
 * The child picks one badge of their oldest pending offer; it goes to the piggy bank.
 */
export function chooseBadge(
  profile: ChildProfile,
  badgeId: string,
  now: number = Date.now(),
  uid: string = `badge_${now}_${Math.random().toString(36).slice(2, 8)}`
): ChildProfile {
  const [offer, ...remaining] = profile.badgeOffers ?? [];
  if (!offer || !offer.includes(badgeId)) {
    throw new Error(`Badge ${badgeId} is not part of the current offer`);
  }
  return {
    ...profile,
    badgeOffers: remaining,
    badges: [...(profile.badges ?? []), { uid, badgeId, earnedAt: now }],
  };
}

export const unspentBadges = (profile: ChildProfile): OwnedBadge[] =>
  (profile.badges ?? []).filter((b) => b.spentAt === undefined);

/**
 * Exchanges badges from the piggy bank for a real-life reward.
 * The oldest badges are spent first; they stay in the album, marked as spent.
 */
export function spendBadges(
  profile: ChildProfile,
  item: ShopItem,
  now: number = Date.now()
): ChildProfile {
  const available = unspentBadges(profile)
    .sort((a, b) => a.earnedAt - b.earnedAt);
  if (item.cost < 1 || available.length < item.cost) {
    throw new Error('Not enough badges');
  }
  const toSpend = new Set(available.slice(0, item.cost).map((b) => b.uid));
  return {
    ...profile,
    badges: (profile.badges ?? []).map((b) =>
      toSpend.has(b.uid) ? { ...b, spentAt: now, spentOn: item.label } : b
    ),
  };
}

export const defaultShop = (language: 'fr' | 'en'): ShopItem[] => {
  const fr = language === 'fr';
  return [
    { id: 'shop_dessert', icon: '🍨', label: fr ? 'Choisir le dessert' : 'Choose dessert', cost: 3 },
    { id: 'shop_game', icon: '🎲', label: fr ? 'Un jeu avec papa ou maman' : 'A game with mum or dad', cost: 4 },
    { id: 'shop_movie', icon: '🎬', label: fr ? 'Choisir le dessin animé' : 'Choose the cartoon', cost: 5 },
    { id: 'shop_story', icon: '📚', label: fr ? 'Une histoire en plus' : 'One more story', cost: 3 },
    { id: 'shop_park', icon: '🌳', label: fr ? 'Sortie au parc' : 'Trip to the park', cost: 10 },
  ];
};

/**
 * Shop items configured by the parent, or the default ones for older settings.
 */
export const shopItems = (settings: ParentSettings | undefined): ShopItem[] =>
  settings?.shop ?? defaultShop(settings?.language ?? 'fr');
