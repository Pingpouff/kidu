import type { EmotionLevel } from '../../../domain/models';

/**
 * Emotion families: each one has an owl expression and a base color.
 * Every family is welcome — none is "bad" (no alarm red for anger).
 */
export type EmotionFamily = 'joy' | 'sadness' | 'anger' | 'fear' | 'disgust' | 'calm';

export const EMOTION_FAMILIES: EmotionFamily[] = ['joy', 'sadness', 'anger', 'fear', 'disgust', 'calm'];

/** Base pastel color of each family (DA, version B). */
export const FAMILY_COLORS: Record<EmotionFamily, string> = {
  joy: '#FFD166',
  sadness: '#7FB3E6',
  anger: '#FF8A65',
  fear: '#B39DDB',
  disgust: '#9CCC8B',
  calm: '#9EE6D8',
};

export interface EmotionDef {
  id: string;
  family: EmotionFamily;
  /** Belly color of the owl: the family color or a nuance of it */
  color: string;
  pleasant: boolean;
  /** First level (age group) that shows this emotion */
  level: EmotionLevel;
}

/**
 * Emotions, in display order. Level 1 (3-5): the 6 families; level 2 (6-8):
 * 12 emotions; level 3 (9-11): 24. Labels: `emo.emotion.<id>` in the dictionary.
 */
export const EMOTIONS: EmotionDef[] = [
  // Level 1
  { id: 'joy', family: 'joy', color: '#FFD166', pleasant: true, level: 1 },
  { id: 'calm', family: 'calm', color: '#9EE6D8', pleasant: true, level: 1 },
  { id: 'sadness', family: 'sadness', color: '#7FB3E6', pleasant: false, level: 1 },
  { id: 'anger', family: 'anger', color: '#FF8A65', pleasant: false, level: 1 },
  { id: 'fear', family: 'fear', color: '#B39DDB', pleasant: false, level: 1 },
  { id: 'disgust', family: 'disgust', color: '#9CCC8B', pleasant: false, level: 1 },
  // Level 2
  { id: 'pride', family: 'joy', color: '#FFC24D', pleasant: true, level: 2 },
  { id: 'surprise', family: 'joy', color: '#FFE29A', pleasant: true, level: 2 },
  { id: 'disappointment', family: 'sadness', color: '#9DC3EC', pleasant: false, level: 2 },
  { id: 'jealousy', family: 'anger', color: '#FFA585', pleasant: false, level: 2 },
  { id: 'worry', family: 'fear', color: '#C6B5E4', pleasant: false, level: 2 },
  { id: 'boredom', family: 'sadness', color: '#B8C4D6', pleasant: false, level: 2 },
  // Level 3
  { id: 'excitement', family: 'joy', color: '#FFB733', pleasant: true, level: 3 },
  { id: 'gratitude', family: 'joy', color: '#FFD98A', pleasant: true, level: 3 },
  { id: 'relief', family: 'calm', color: '#B5EDE2', pleasant: true, level: 3 },
  { id: 'frustration', family: 'anger', color: '#FF9E7A', pleasant: false, level: 3 },
  { id: 'annoyance', family: 'anger', color: '#FFB59A', pleasant: false, level: 3 },
  { id: 'impatience', family: 'anger', color: '#FFC4AE', pleasant: false, level: 3 },
  { id: 'embarrassment', family: 'fear', color: '#D3C5EA', pleasant: false, level: 3 },
  { id: 'confusion', family: 'fear', color: '#BFAEE0', pleasant: false, level: 3 },
  { id: 'shame', family: 'sadness', color: '#8DB6E0', pleasant: false, level: 3 },
  { id: 'guilt', family: 'sadness', color: '#A9C9EE', pleasant: false, level: 3 },
  { id: 'loneliness', family: 'sadness', color: '#6FA6DE', pleasant: false, level: 3 },
  { id: 'discouragement', family: 'sadness', color: '#93B8E2', pleasant: false, level: 3 },
];

/** The emotions shown at a level, in display order. */
export function emotionsForLevel(level: EmotionLevel): EmotionDef[] {
  return EMOTIONS.filter((e) => e.level <= level);
}

export function emotionById(id: string | undefined): EmotionDef | undefined {
  return EMOTIONS.find((e) => e.id === id);
}

/* ------------------------------- Strategies ------------------------------- */

export type StrategyFamily = 'breathe' | 'move' | 'senses' | 'talk' | 'think';

export interface StrategyDef {
  id: string;
  family: StrategyFamily;
  icon: string;
  /** First level (age group) it is offered to */
  level: EmotionLevel;
}

/**
 * Things a child can do with a big emotion. Labels: `emo.strategy.<id>`,
 * short spoken instruction: `emo.strategy.<id>.how`.
 */
export const STRATEGIES: StrategyDef[] = [
  { id: 'flower_candle', family: 'breathe', icon: '🌸', level: 1 },
  { id: 'balloon_belly', family: 'breathe', icon: '🎈', level: 1 },
  { id: 'wet_dog', family: 'move', icon: '🐕', level: 1 },
  { id: 'jumps', family: 'move', icon: '🦘', level: 1 },
  { id: 'turtle', family: 'move', icon: '🐢', level: 1 },
  { id: 'push_wall', family: 'move', icon: '🧱', level: 2 },
  { id: 'squeeze_pillow', family: 'senses', icon: '🧸', level: 1 },
  { id: 'glass_water', family: 'senses', icon: '💧', level: 1 },
  { id: 'five_things', family: 'senses', icon: '👀', level: 2 },
  { id: 'cool_water', family: 'senses', icon: '🚰', level: 2 },
  { id: 'hug', family: 'talk', icon: '🤗', level: 1 },
  { id: 'draw', family: 'talk', icon: '🖍️', level: 1 },
  { id: 'i_feel', family: 'talk', icon: '💬', level: 2 },
  { id: 'one_week', family: 'think', icon: '📅', level: 3 },
  { id: 'friend_advice', family: 'think', icon: '🫶', level: 3 },
  { id: 'countdown', family: 'think', icon: '🔢', level: 3 },
];

export function strategyById(id: string): StrategyDef | undefined {
  return STRATEGIES.find((s) => s.id === id);
}

export function strategiesForLevel(level: EmotionLevel): StrategyDef[] {
  return STRATEGIES.filter((s) => s.level <= level);
}

/** Suggested first when the child has not marked anything as helpful yet. */
export const DEFAULT_SUGGESTIONS: Record<EmotionLevel, string[]> = {
  1: ['squeeze_pillow', 'wet_dog', 'glass_water', 'draw'],
  2: ['squeeze_pillow', 'five_things', 'push_wall', 'glass_water'],
  3: ['five_things', 'countdown', 'push_wall', 'friend_advice'],
};
