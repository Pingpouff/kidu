/**
 * Badge catalog: original, generic themes kids love (no licensed characters).
 */

export type UniverseId =
  | 'dinosaurs'
  | 'space'
  | 'ocean'
  | 'dragons'
  | 'unicorns'
  | 'vehicles'
  | 'jungle'
  | 'farm'
  | 'heroes'
  | 'sweets';

export interface Universe {
  id: UniverseId;
  icon: string;
  name: { fr: string; en: string };
  /** Tailwind gradient classes for the badge disc */
  gradient: string;
}

export interface Badge {
  id: string;
  universe: UniverseId;
  emoji: string;
  name: { fr: string; en: string };
}

export const UNIVERSES: Universe[] = [
  { id: 'dinosaurs', icon: '🦕', name: { fr: 'Dinosaures', en: 'Dinosaurs' }, gradient: 'from-lime-400 to-emerald-700' },
  { id: 'space', icon: '🚀', name: { fr: 'Espace', en: 'Space' }, gradient: 'from-indigo-400 to-violet-800' },
  { id: 'ocean', icon: '🐙', name: { fr: 'Océan', en: 'Ocean' }, gradient: 'from-cyan-300 to-blue-700' },
  { id: 'dragons', icon: '🐉', name: { fr: 'Chevaliers & dragons', en: 'Knights & dragons' }, gradient: 'from-red-400 to-rose-800' },
  { id: 'unicorns', icon: '🦄', name: { fr: 'Fées & licornes', en: 'Fairies & unicorns' }, gradient: 'from-pink-300 to-fuchsia-700' },
  { id: 'vehicles', icon: '🚒', name: { fr: 'Véhicules', en: 'Vehicles' }, gradient: 'from-orange-300 to-red-600' },
  { id: 'jungle', icon: '🦁', name: { fr: 'Jungle', en: 'Jungle' }, gradient: 'from-yellow-300 to-amber-700' },
  { id: 'farm', icon: '🐄', name: { fr: 'Ferme', en: 'Farm' }, gradient: 'from-green-300 to-lime-700' },
  { id: 'heroes', icon: '🦸', name: { fr: 'Super-héros', en: 'Superheroes' }, gradient: 'from-sky-400 to-indigo-700' },
  { id: 'sweets', icon: '🍭', name: { fr: 'Pays des bonbons', en: 'Candy land' }, gradient: 'from-rose-300 to-pink-600' },
];

const b = (universe: UniverseId, id: string, emoji: string, fr: string, en: string): Badge => ({
  id: `${universe}.${id}`,
  universe,
  emoji,
  name: { fr, en },
});

export const BADGES: Badge[] = [
  b('dinosaurs', 'trex', '🦖', 'T-Rex rigolo', 'Funny T-Rex'),
  b('dinosaurs', 'longneck', '🦕', 'Grand cou', 'Long neck'),
  b('dinosaurs', 'egg', '🥚', 'Œuf mystère', 'Mystery egg'),
  b('dinosaurs', 'volcano', '🌋', 'Volcan', 'Volcano'),
  b('dinosaurs', 'bone', '🦴', 'Os de fossile', 'Fossil bone'),
  b('dinosaurs', 'footprint', '🐾', 'Grosses empreintes', 'Big footprints'),

  b('space', 'rocket', '🚀', 'Fusée', 'Rocket'),
  b('space', 'astronaut', '🧑‍🚀', 'Astronaute', 'Astronaut'),
  b('space', 'planet', '🪐', 'Planète à anneaux', 'Ringed planet'),
  b('space', 'alien', '👽', 'Petit extraterrestre', 'Little alien'),
  b('space', 'comet', '☄️', 'Comète', 'Comet'),
  b('space', 'moon', '🌕', 'Pleine lune', 'Full moon'),

  b('ocean', 'octopus', '🐙', 'Pieuvre', 'Octopus'),
  b('ocean', 'dolphin', '🐬', 'Dauphin', 'Dolphin'),
  b('ocean', 'whale', '🐳', 'Baleine', 'Whale'),
  b('ocean', 'turtle', '🐢', 'Tortue de mer', 'Sea turtle'),
  b('ocean', 'shell', '🐚', 'Coquillage', 'Seashell'),
  b('ocean', 'fish', '🐠', 'Poisson clown', 'Clownfish'),

  b('dragons', 'dragon', '🐉', 'Dragon gentil', 'Kind dragon'),
  b('dragons', 'castle', '🏰', 'Château fort', 'Castle'),
  b('dragons', 'shield', '🛡️', 'Bouclier', 'Shield'),
  b('dragons', 'crown', '👑', 'Couronne', 'Crown'),
  b('dragons', 'sword', '🗡️', 'Épée magique', 'Magic sword'),
  b('dragons', 'horse', '🐴', 'Cheval du chevalier', "Knight's horse"),

  b('unicorns', 'unicorn', '🦄', 'Licorne', 'Unicorn'),
  b('unicorns', 'fairy', '🧚', 'Fée', 'Fairy'),
  b('unicorns', 'rainbow', '🌈', 'Arc-en-ciel', 'Rainbow'),
  b('unicorns', 'wand', '🪄', 'Baguette magique', 'Magic wand'),
  b('unicorns', 'sparkles', '✨', 'Poussière d\'étoile', 'Stardust'),
  b('unicorns', 'flower', '🌸', 'Fleur enchantée', 'Enchanted flower'),

  b('vehicles', 'firetruck', '🚒', 'Camion de pompiers', 'Fire truck'),
  b('vehicles', 'racecar', '🏎️', 'Voiture de course', 'Race car'),
  b('vehicles', 'tractor', '🚜', 'Tracteur', 'Tractor'),
  b('vehicles', 'train', '🚂', 'Train à vapeur', 'Steam train'),
  b('vehicles', 'helicopter', '🚁', 'Hélicoptère', 'Helicopter'),
  b('vehicles', 'digger', '🏗️', 'Grue', 'Crane'),

  b('jungle', 'lion', '🦁', 'Lion', 'Lion'),
  b('jungle', 'monkey', '🐒', 'Singe farceur', 'Cheeky monkey'),
  b('jungle', 'elephant', '🐘', 'Éléphant', 'Elephant'),
  b('jungle', 'parrot', '🦜', 'Perroquet', 'Parrot'),
  b('jungle', 'giraffe', '🦒', 'Girafe', 'Giraffe'),
  b('jungle', 'tiger', '🐯', 'Tigre', 'Tiger'),

  b('farm', 'cow', '🐄', 'Vache', 'Cow'),
  b('farm', 'pig', '🐷', 'Petit cochon', 'Piglet'),
  b('farm', 'chick', '🐥', 'Poussin', 'Chick'),
  b('farm', 'sheep', '🐑', 'Mouton', 'Sheep'),
  b('farm', 'rabbit', '🐰', 'Lapin', 'Bunny'),
  b('farm', 'sunflower', '🌻', 'Tournesol', 'Sunflower'),

  b('heroes', 'cape', '🦸', 'Super-héros', 'Superhero'),
  b('heroes', 'bolt', '⚡', 'Super-vitesse', 'Super speed'),
  b('heroes', 'muscle', '💪', 'Super-force', 'Super strength'),
  b('heroes', 'mask', '🎭', 'Masque secret', 'Secret mask'),
  b('heroes', 'star', '🌟', 'Étoile héroïque', 'Hero star'),
  b('heroes', 'robot', '🤖', 'Robot ami', 'Robot friend'),

  b('sweets', 'lollipop', '🍭', 'Sucette', 'Lollipop'),
  b('sweets', 'cupcake', '🧁', 'Cupcake', 'Cupcake'),
  b('sweets', 'icecream', '🍦', 'Glace', 'Ice cream'),
  b('sweets', 'donut', '🍩', 'Beignet', 'Donut'),
  b('sweets', 'cookie', '🍪', 'Cookie', 'Cookie'),
  b('sweets', 'candy', '🍬', 'Bonbon', 'Candy'),
];

const BADGES_BY_ID = new Map(BADGES.map((badge) => [badge.id, badge]));
const UNIVERSES_BY_ID = new Map(UNIVERSES.map((u) => [u.id, u]));

export const getBadge = (id: string): Badge | undefined => BADGES_BY_ID.get(id);
export const getUniverse = (id: UniverseId): Universe => UNIVERSES_BY_ID.get(id)!;
export const isBadgeId = (id: unknown): id is string => typeof id === 'string' && BADGES_BY_ID.has(id);

/**
 * Draws `count` badges from distinct universes, mixing all universes.
 * Badges the child doesn't own yet are preferred so the collection grows.
 * `random` is injectable for deterministic tests.
 */
export function drawBadgeOffer(
  ownedBadgeIds: string[],
  count = 3,
  random: () => number = Math.random
): string[] {
  const owned = new Set(ownedBadgeIds);
  const shuffle = <T,>(items: T[]): T[] => {
    const a = [...items];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  // Universes that still have badges to discover come first
  const hasFresh = (u: Universe) => BADGES.some((badge) => badge.universe === u.id && !owned.has(badge.id));
  const universes = shuffle(UNIVERSES).sort((x, y) => Number(hasFresh(y)) - Number(hasFresh(x)));

  const offer: string[] = [];
  for (const universe of universes) {
    if (offer.length === count) break;
    const candidates = BADGES.filter((badge) => badge.universe === universe.id);
    const fresh = candidates.filter((badge) => !owned.has(badge.id));
    const pool = fresh.length > 0 ? fresh : candidates;
    offer.push(shuffle(pool)[0].id);
  }
  return offer;
}
