import { describe, it, expect } from 'vitest';
import { RoutineSession, TaskDefinition, TaskStatus } from '../domain/models';
import { computeTrophyStats, findNewTrophies, LIGHTNING_WINDOW_MS } from '../domain/trophies';
import { createBackup, parseBackup } from '../domain/backup';

const definitions: TaskDefinition[] = [
  { id: 'snack', labelKey: '', defaultLabel: 'Snack', icon: '🍎', order: 1, category: 'after_school' },
  { id: 'table', labelKey: '', defaultLabel: 'Table', icon: '🍴', order: 2, category: 'meal' },
  { id: 'teeth', labelKey: '', defaultLabel: 'Teeth', icon: '🪥', order: 3, category: 'bedtime' },
];

/** Local timestamp for a given date and hour */
const at = (date: string, hour: number, minute = 0) => {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y, m - 1, d, hour, minute).getTime();
};

/**
 * Builds a session. `done` lists the definitions completed; tasks are completed
 * 10 minutes apart starting at `startHour` (so no lightning unless asked).
 */
const session = (
  date: string,
  done: string[] = definitions.map((d) => d.id),
  { startHour = 19, gapMs = 10 * 60 * 1000 } = {}
): RoutineSession => {
  const tasks = definitions.map((d, i) => {
    const isDone = done.includes(d.id);
    return {
      id: `leo_${d.id}_${date}`,
      definitionId: d.id,
      status: (isDone ? 'done' : 'todo') as TaskStatus,
      completedAt: isDone ? at(date, startHour) + i * gapMs : undefined,
    };
  });
  const isCompleted = tasks.every((t) => t.status === 'done');
  return {
    id: `${date}_leo`,
    childId: 'leo',
    date,
    tasks,
    isCompleted,
    completedAt: isCompleted ? Math.max(...tasks.map((t) => t.completedAt!)) : undefined,
  };
};

const trophiesFor = (sessions: RoutineSession[]) =>
  findNewTrophies(computeTrophyStats(sessions, definitions));

describe('Trophies', () => {
  it('earns nothing without any completed step', () => {
    expect(trophiesFor([session('2026-11-09', [])])).toEqual([]);
  });

  it('earns "first step" as soon as one phase is completed', () => {
    expect(trophiesFor([session('2026-11-09', ['snack'])])).toEqual(['first_step']);
  });

  it('earns "first routine" once every step is done', () => {
    // Every step done, bedtime finished at 7:20 pm: also a full day and an early night
    expect(trophiesFor([session('2026-11-09')])).toEqual(['first_step', 'first_routine', 'full_day', 'early_night']);
    expect(trophiesFor([session('2026-11-09', undefined, { startHour: 20 })])).toEqual(['first_step', 'first_routine', 'full_day']);
  });

  it('earns "early bird" when the morning step is finished before 8 am', () => {
    const morning: TaskDefinition[] = [
      { id: 'dress', labelKey: '', defaultLabel: 'Dress', icon: '👖', order: 1, category: 'morning' },
      { id: 'breakfast', labelKey: '', defaultLabel: 'Breakfast', icon: '🥣', order: 2, category: 'morning' },
    ];
    const morningSession = (lastDoneHour: number): RoutineSession => ({
      id: '2026-11-09_leo',
      childId: 'leo',
      date: '2026-11-09',
      isCompleted: false,
      tasks: [
        { id: 'a', definitionId: 'dress', status: 'done', completedAt: at('2026-11-09', 7, 10) },
        { id: 'b', definitionId: 'breakfast', status: 'done', completedAt: at('2026-11-09', lastDoneHour, 40) },
      ],
    });
    expect(findNewTrophies(computeTrophyStats([morningSession(7)], morning))).toContain('early_bird');
    expect(findNewTrophies(computeTrophyStats([morningSession(8)], morning))).not.toContain('early_bird');
    // Evening steps never count, however early
    expect(trophiesFor([session('2026-11-09', undefined, { startHour: 6 })])).not.toContain('early_bird');
  });

  it('counts consecutive days for streaks, across month boundaries', () => {
    const stats = computeTrophyStats(
      [session('2026-10-30'), session('2026-10-31'), session('2026-11-01')],
      definitions
    );
    expect(stats.currentStreak).toBe(3);
    expect(findNewTrophies(stats)).toContain('streak_3');
  });

  it('breaks the streak when a day is missed or not completed', () => {
    const missed = computeTrophyStats(
      [session('2026-11-01'), session('2026-11-02'), session('2026-11-04')],
      definitions
    );
    expect(missed.currentStreak).toBe(1);

    const incomplete = computeTrophyStats(
      [session('2026-11-01'), session('2026-11-02', ['snack']), session('2026-11-03')],
      definitions
    );
    expect(incomplete.currentStreak).toBe(1);
  });

  it('earns "streak 7" and phase medals over time', () => {
    const days = Array.from({ length: 10 }, (_, i) => session(`2026-11-${String(i + 1).padStart(2, '0')}`));
    const medals = trophiesFor(days);
    expect(medals).toEqual(expect.arrayContaining([
      'streak_3', 'streak_7', 'routines_10', 'after_school_10', 'meal_10', 'bedtime_10',
    ]));
    expect(medals).not.toContain('routines_30');
  });

  it('earns "lightning" for 3 tasks done within 5 minutes', () => {
    const fast = session('2026-11-09', undefined, { gapMs: LIGHTNING_WINDOW_MS / 2 });
    expect(trophiesFor([fast])).toContain('lightning');
    expect(trophiesFor([session('2026-11-09')])).not.toContain('lightning');
  });

  it('never returns a medal the child already has', () => {
    const stats = computeTrophyStats([session('2026-11-09')], definitions);
    const earned = [{ id: 'first_routine' as const, earnedAt: 1 }];
    expect(findNewTrophies(stats, earned)).toEqual(['first_step', 'full_day', 'early_night']);
  });

  it('earns medal and star milestones from the profile', () => {
    const forProfile = (medalCount: number, stars: number) =>
      findNewTrophies(computeTrophyStats([], definitions, { medalCount, stars }));
    expect(forProfile(0, 2)).toEqual([]);
    expect(forProfile(1, 3)).toEqual(['medal_1']);
    expect(forProfile(10, 99)).toEqual(['medal_1', 'medals_10']);
    expect(forProfile(50, 500)).toEqual(['medal_1', 'medals_10', 'medals_25', 'medals_50', 'stars_100', 'stars_500']);
  });

  it('earns "perfect week" only for Monday to Sunday, every day completed', () => {
    // 9 → 15 November 2026 is Monday → Sunday
    const week = Array.from({ length: 7 }, (_, i) => session(`2026-11-${String(9 + i).padStart(2, '0')}`));
    expect(trophiesFor(week)).toContain('perfect_week');
    // 7 days in a row, but Tuesday → Monday
    const shifted = Array.from({ length: 7 }, (_, i) => session(`2026-11-${String(10 + i).padStart(2, '0')}`));
    expect(trophiesFor(shifted)).not.toContain('perfect_week');
    // A hole on Thursday
    expect(trophiesFor(week.filter((s) => s.date !== '2026-11-12'))).not.toContain('perfect_week');
  });

  it('earns "full day" only when no step was skipped, "weekend" on Saturday or Sunday', () => {
    const skipped = { ...session('2026-11-09', ['snack', 'table']), skippedPhases: ['bedtime' as const], isCompleted: true };
    expect(trophiesFor([skipped])).not.toContain('full_day');
    expect(trophiesFor([session('2026-11-09')])).not.toContain('weekend'); // Monday
    expect(trophiesFor([session('2026-11-14')])).toContain('weekend'); // Saturday
    expect(trophiesFor([session('2026-11-15')])).toContain('weekend'); // Sunday
  });

  it('earns "comeback" for a routine completed after 2 days or more without one', () => {
    expect(trophiesFor([session('2026-11-02'), session('2026-11-04')])).not.toContain('comeback'); // 1 day off
    expect(trophiesFor([session('2026-11-02'), session('2026-11-05')])).toContain('comeback'); // 2 days off
    expect(trophiesFor([session('2026-11-05')])).not.toContain('comeback'); // first routine ever
  });

    it('keeps medals in backups and rejects unknown ones', () => {
    const settings = { parentPin: '1234', language: 'fr' as const, rewards: { starsPerCompletion: 1, weeklyGoal: 5 } };
    const profile = {
      id: 'leo', name: 'Léo', avatar: '🦊', color: 'indigo' as const, stars: 3,
      trophies: [{ id: 'streak_3' as const, earnedAt: 1762628400000 }],
    };
    const backup = createBackup({ settings, tasks: definitions, profiles: [profile] });
    expect(parseBackup(JSON.stringify(backup)).data.profiles[0].trophies).toEqual(profile.trophies);

    const invalid = { ...backup, data: { ...backup.data, profiles: [{ ...profile, trophies: [{ id: 'gold', earnedAt: 1 }] }] } };
    expect(() => parseBackup(JSON.stringify(invalid))).toThrow();
  });
});
