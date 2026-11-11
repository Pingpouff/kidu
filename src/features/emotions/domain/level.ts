import type { ChildProfile, EmotionLevel } from '../../../domain/models';

/**
 * Age group of the emotions space: 1 for 3-5 year olds (6 emotions, no
 * intensity), 2 for 6-8 (12 emotions), 3 for 9-11 (24 emotions, thinking
 * strategies). Unknown age: level 2, the middle ground (everything is also spoken).
 */
export function ageLevel(age: number | undefined): EmotionLevel {
  if (age === undefined || !Number.isFinite(age)) return 2;
  if (age < 6) return 1;
  if (age < 9) return 2;
  return 3;
}

/** The parent's choice if any, else from the child's age. */
export function childLevel(profile: Pick<ChildProfile, 'age' | 'emotions'> | undefined | null): EmotionLevel {
  return profile?.emotions?.level ?? ageLevel(profile?.age);
}
