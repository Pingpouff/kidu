import { RoutineSession, TaskDefinition, TaskCategory } from './models';
import { getRoutinePhases } from './routine';

export const TROPHY_IDS = [
  'first_step',
  'first_routine',
  'streak_3',
  'streak_7',
  'routines_10',
  'routines_30',
  'morning_10',
  'after_school_10',
  'meal_10',
  'bedtime_10',
  'lightning',
  'early_bird',
] as const;
export type TrophyId = typeof TROPHY_IDS[number];

export interface EarnedTrophy {
  id: TrophyId;
  earnedAt: number; // epoch
}

/** Translation keys: `trophy.<id>.name` and `trophy.<id>.hint` */
export const TROPHY_ICONS: Record<TrophyId, string> = {
  first_step: '⭐',
  first_routine: '🥇',
  streak_3: '🔥',
  streak_7: '🌈',
  routines_10: '🏆',
  routines_30: '👑',
  morning_10: '☀️',
  after_school_10: '🎒',
  meal_10: '🍽️',
  bedtime_10: '🌙',
  lightning: '⚡',
  early_bird: '🐦',
};

/** Three tasks finished within this window earn the "lightning" medal. */
export const LIGHTNING_WINDOW_MS = 5 * 60 * 1000;
/** Routine finished before this local hour earns the "early bird" trophy. */
export const EARLY_BIRD_HOUR = 20;

export interface TrophyStats {
  completedRoutines: number;
  currentStreak: number;
  phaseCompletions: Record<TaskCategory, number>;
  hadLightning: boolean;
  hadEarlyBird: boolean;
}

/**
 * Number of days between two YYYY-MM-DD dates (b - a), DST-safe.
 */
export function dayDiff(a: string, b: string): number {
  const toUtc = (d: string) => {
    const [y, m, day] = d.split('-').map(Number);
    return Date.UTC(y, m - 1, day);
  };
  return Math.round((toUtc(b) - toUtc(a)) / 86_400_000);
}

/**
 * Longest run of consecutive days with a completed routine, ending on the most recent one.
 */
export function currentStreak(completedDates: string[]): number {
  const dates = [...new Set(completedDates)].sort();
  if (dates.length === 0) return 0;
  let streak = 1;
  for (let i = dates.length - 1; i > 0; i--) {
    if (dayDiff(dates[i - 1], dates[i]) === 1) streak++;
    else break;
  }
  return streak;
}

function hasLightning(session: RoutineSession): boolean {
  const times = session.tasks
    .filter((t) => t.status === 'done' && t.completedAt !== undefined)
    .map((t) => t.completedAt!)
    .sort((a, b) => a - b);
  for (let i = 2; i < times.length; i++) {
    if (times[i] - times[i - 2] <= LIGHTNING_WINDOW_MS) return true;
  }
  return false;
}

/**
 * Computes a child's trophy statistics from all their sessions.
 */
export function computeTrophyStats(
  sessions: RoutineSession[],
  definitions: TaskDefinition[]
): TrophyStats {
  const completed = sessions.filter((s) => s.isCompleted);
  const phaseCompletions: Record<TaskCategory, number> = { morning: 0, after_school: 0, meal: 0, bedtime: 0 };

  for (const session of sessions) {
    for (const phase of getRoutinePhases(session, definitions)) {
      if (phase.isCompleted) phaseCompletions[phase.category]++;
    }
  }

  return {
    completedRoutines: completed.length,
    currentStreak: currentStreak(completed.map((s) => s.date)),
    phaseCompletions,
    hadLightning: sessions.some(hasLightning),
    hadEarlyBird: completed.some(
      (s) => s.completedAt !== undefined && new Date(s.completedAt).getHours() < EARLY_BIRD_HOUR
    ),
  };
}

const RULES: Record<TrophyId, (s: TrophyStats) => boolean> = {
  first_step: (s) => Object.values(s.phaseCompletions).some((n) => n >= 1),
  first_routine: (s) => s.completedRoutines >= 1,
  streak_3: (s) => s.currentStreak >= 3,
  streak_7: (s) => s.currentStreak >= 7,
  routines_10: (s) => s.completedRoutines >= 10,
  routines_30: (s) => s.completedRoutines >= 30,
  morning_10: (s) => s.phaseCompletions.morning >= 10,
  after_school_10: (s) => s.phaseCompletions.after_school >= 10,
  meal_10: (s) => s.phaseCompletions.meal >= 10,
  bedtime_10: (s) => s.phaseCompletions.bedtime >= 10,
  lightning: (s) => s.hadLightning,
  early_bird: (s) => s.hadEarlyBird,
};

/**
 * Returns the trophies earned by these stats that the child doesn't have yet,
 * in catalog order. Trophies are never taken back.
 */
export function findNewTrophies(stats: TrophyStats, alreadyEarned: EarnedTrophy[] = []): TrophyId[] {
  const owned = new Set(alreadyEarned.map((m) => m.id));
  return TROPHY_IDS.filter((id) => !owned.has(id) && RULES[id](stats));
}
