import { ChildProfile, RoutineSession, TaskDefinition, TaskCategory } from './models';
import { getRoutinePhases, weekdayOf } from './routine';

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
  // Medals and stars
  'medal_1',
  'medals_10',
  'medals_25',
  'medals_50',
  'stars_100',
  'stars_500',
  // Everyday challenges
  'perfect_week',
  'full_day',
  'weekend',
  'comeback',
  'early_night',
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
  medal_1: '🏅',
  medals_10: '🎖️',
  medals_25: '💎',
  medals_50: '🌟',
  stars_100: '✨',
  stars_500: '🌠',
  perfect_week: '📅',
  full_day: '🌞',
  weekend: '🛝',
  comeback: '🔄',
  early_night: '🛌',
};

/** Three tasks finished within this window earn the "lightning" medal. */
export const LIGHTNING_WINDOW_MS = 5 * 60 * 1000;
/** Morning step finished before this local hour earns the "early bird" trophy. */
export const EARLY_BIRD_HOUR = 8;
/** Bedtime step finished before this local hour earns the "early night" trophy. */
export const EARLY_NIGHT_HOUR = 20;
/** A completed routine after at least this many days without one earns "comeback". */
export const COMEBACK_GAP_DAYS = 3;

export interface TrophyStats {
  completedRoutines: number;
  currentStreak: number;
  phaseCompletions: Record<TaskCategory, number>;
  hadLightning: boolean;
  hadEarlyBird: boolean;
  /** From the profile */
  medals: number;
  stars: number;
  /** Monday to Sunday, every day's routine completed */
  hadPerfectWeek: boolean;
  /** A day where every step was done (none skipped), at least 2 steps */
  hadFullDay: boolean;
  /** A routine completed on a Saturday or a Sunday */
  hadWeekend: boolean;
  /** A routine completed after 2 days or more without one */
  hadComeback: boolean;
  /** Bedtime step finished before 8 pm */
  hadEarlyNight: boolean;
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
  definitions: TaskDefinition[],
  profile?: Pick<ChildProfile, 'stars' | 'medalCount'>
): TrophyStats {
  const completed = sessions.filter((s) => s.isCompleted);
  const completedDates = [...new Set(completed.map((s) => s.date))].sort();
  const phaseCompletions: Record<TaskCategory, number> = { morning: 0, after_school: 0, meal: 0, bedtime: 0 };
  let hadEarlyBird = false;
  let hadEarlyNight = false;
  let hadFullDay = false;

  const finishedAt = (tasks: { completedAt?: number }[]) => Math.max(...tasks.map((t) => t.completedAt ?? Infinity));

  for (const session of sessions) {
    const phases = getRoutinePhases(session, definitions);
    if (phases.length >= 2 && phases.every((p) => p.isCompleted && !p.isSkipped)) hadFullDay = true;
    for (const phase of phases) {
      if (!phase.isCompleted) continue;
      phaseCompletions[phase.category]++;
      const end = finishedAt(phase.tasks);
      if (!Number.isFinite(end)) continue;
      if (phase.category === 'morning' && new Date(end).getHours() < EARLY_BIRD_HOUR) hadEarlyBird = true;
      if (phase.category === 'bedtime' && new Date(end).getHours() < EARLY_NIGHT_HOUR) hadEarlyNight = true;
    }
  }

  const done = new Set(completedDates);
  const hadPerfectWeek = completedDates.some((date) => {
    if (weekdayOf(date) !== 1) return false; // starts on a Monday
    const monday = new Date(`${date}T12:00:00`);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday.getTime() + i * 86_400_000);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }).every((d) => done.has(d));
  });

  return {
    completedRoutines: completed.length,
    currentStreak: currentStreak(completedDates),
    phaseCompletions,
    hadLightning: sessions.some(hasLightning),
    hadEarlyBird,
    medals: profile?.medalCount ?? 0,
    stars: profile?.stars ?? 0,
    hadPerfectWeek,
    hadFullDay,
    hadWeekend: completedDates.some((d) => weekdayOf(d) === 0 || weekdayOf(d) === 6),
    hadComeback: completedDates.some((d, i) => i > 0 && dayDiff(completedDates[i - 1], d) >= COMEBACK_GAP_DAYS),
    hadEarlyNight,
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
  medal_1: (s) => s.medals >= 1,
  medals_10: (s) => s.medals >= 10,
  medals_25: (s) => s.medals >= 25,
  medals_50: (s) => s.medals >= 50,
  stars_100: (s) => s.stars >= 100,
  stars_500: (s) => s.stars >= 500,
  perfect_week: (s) => s.hadPerfectWeek,
  full_day: (s) => s.hadFullDay,
  weekend: (s) => s.hadWeekend,
  comeback: (s) => s.hadComeback,
  early_night: (s) => s.hadEarlyNight,
};

/**
 * Returns the trophies earned by these stats that the child doesn't have yet,
 * in catalog order. Trophies are never taken back.
 */
export function findNewTrophies(stats: TrophyStats, alreadyEarned: EarnedTrophy[] = []): TrophyId[] {
  const owned = new Set(alreadyEarned.map((m) => m.id));
  return TROPHY_IDS.filter((id) => !owned.has(id) && RULES[id](stats));
}
