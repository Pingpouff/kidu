import { describe, it, expect } from 'vitest';
import { ChildProfile, RoutineSession, TaskDefinition } from '../domain/models';
import {
  getCurrentPhaseIndex,
  getRoutinePhases,
  initSession,
  isSessionCompleted,
  isTaskForDay,
  moveTask,
  resetSession,
  skipPhase,
  syncSessionWithDefinitions,
  unskipPhase,
  weekdayOf,
} from '../domain/routine';
import { findOverdueTasks, findStartingTasks } from '../domain/reminders';
import { childSummary } from '../domain/summary';
import { createBackup, parseBackup } from '../domain/backup';
import { computeTrophyStats } from '../domain/trophies';

const MONDAY = '2026-11-09';
const SATURDAY = '2026-11-14';

const definitions: TaskDefinition[] = [
  { id: 'dress', labelKey: '', defaultLabel: 'Dress', icon: '👖', order: 1, category: 'morning', dueTime: '08:00' },
  { id: 'bag', labelKey: '', defaultLabel: 'Bag', icon: '🎒', order: 1, category: 'after_school', days: [1, 2, 3, 4, 5] },
  { id: 'snack', labelKey: '', defaultLabel: 'Snack', icon: '🍎', order: 2, category: 'after_school' },
  { id: 'teeth', labelKey: '', defaultLabel: 'Teeth', icon: '🪥', order: 1, category: 'bedtime' },
];
const leo: ChildProfile = { id: 'leo', name: 'Léo', avatar: '🦊', color: 'indigo', stars: 0 };

const doneAll = (session: RoutineSession, ids: string[]) =>
  ids.reduce((s, id) => moveTask(s, s.tasks.find((t) => t.definitionId === id)!.id, 'done', definitions), session);

const at = (date: string, hhmm: string) => {
  const [y, m, d] = date.split('-').map(Number);
  const [h, min] = hhmm.split(':').map(Number);
  return new Date(y, m - 1, d, h, min).getTime();
};

describe('Days of the week', () => {
  it('knows the weekday of a date', () => {
    expect(weekdayOf(MONDAY)).toBe(1);
    expect(weekdayOf(SATURDAY)).toBe(6);
  });

  it('only plans a task on its days', () => {
    expect(isTaskForDay(definitions[1], MONDAY)).toBe(true);
    expect(isTaskForDay(definitions[1], SATURDAY)).toBe(false);
    expect(isTaskForDay(definitions[2], SATURDAY)).toBe(true); // no days = every day
  });

  it('builds and syncs sessions with the tasks of the day', () => {
    expect(initSession('leo', SATURDAY, definitions).tasks.map((t) => t.definitionId)).toEqual(['dress', 'snack', 'teeth']);
    const monday = initSession('leo', MONDAY, definitions);
    expect(monday.tasks.map((t) => t.definitionId)).toContain('bag');
    const weekendOnly = definitions.map((d) => (d.id === 'bag' ? { ...d, days: [0, 6] } : d));
    expect(syncSessionWithDefinitions(monday, weekendOnly).tasks.map((t) => t.definitionId)).not.toContain('bag');
  });

  it('gives no reminder for a task that is not planned today', () => {
    const timed = definitions.map((d) => (d.id === 'bag' ? { ...d, dueTime: '17:00', startTime: '16:30' } : d));
    const evening = at(SATURDAY, '18:00');
    expect(findOverdueTasks(evening, SATURDAY, [leo], [], timed).map((t) => t.definitionId)).not.toContain('bag');
    expect(findStartingTasks(at(SATURDAY, '16:45'), SATURDAY, [leo], [], timed)).toEqual([]);
  });

  it('keeps days in backups and rejects invalid ones', () => {
    const settings = { parentPin: '1234', language: 'fr' as const, rewards: { starsPerCompletion: 1, weeklyGoal: 5 } };
    const backup = createBackup({ settings, tasks: definitions, profiles: [leo] });
    expect(parseBackup(JSON.stringify(backup)).data.tasks.find((t) => t.id === 'bag')?.days).toEqual([1, 2, 3, 4, 5]);
    const invalid = { ...backup, data: { ...backup.data, tasks: [{ ...definitions[1], days: [7] }] } };
    expect(() => parseBackup(JSON.stringify(invalid))).toThrow();
  });
});

describe('Skipping a step', () => {
  it('moves the board to the next step and back when resumed', () => {
    let session = initSession('leo', MONDAY, definitions);
    expect(getRoutinePhases(session, definitions)[getCurrentPhaseIndex(getRoutinePhases(session, definitions))].category).toBe('morning');

    session = skipPhase(session, 'morning', definitions);
    let phases = getRoutinePhases(session, definitions);
    expect(phases[0].isSkipped).toBe(true);
    expect(phases[getCurrentPhaseIndex(phases)].category).toBe('after_school');

    session = unskipPhase(session, 'morning', definitions);
    phases = getRoutinePhases(session, definitions);
    expect(phases[getCurrentPhaseIndex(phases)].category).toBe('morning');
  });

  it('counts the day as completed when every other step is done', () => {
    let session = skipPhase(initSession('leo', MONDAY, definitions), 'morning', definitions);
    session = doneAll(session, ['bag', 'snack']);
    expect(session.isCompleted).toBe(false);
    session = doneAll(session, ['teeth']);
    expect(session.isCompleted).toBe(true);
    expect(session.completedAt).toBeDefined();

    // Resuming the skipped step reopens the day
    expect(unskipPhase(session, 'morning', definitions).isCompleted).toBe(false);
  });

  it('never counts a day where every step was skipped', () => {
    let session = initSession('leo', MONDAY, definitions);
    for (const c of ['morning', 'after_school', 'bedtime'] as const) session = skipPhase(session, c, definitions);
    expect(isSessionCompleted(session, definitions)).toBe(false);
  });

  it('skipping the last remaining step completes the day', () => {
    let session = doneAll(initSession('leo', MONDAY, definitions), ['dress', 'bag', 'snack']);
    expect(session.isCompleted).toBe(false);
    session = skipPhase(session, 'bedtime', definitions);
    expect(session.isCompleted).toBe(true);
  });

  it('a skipped step raises no reminder and its tasks are not proposed next', () => {
    const session = skipPhase(initSession('leo', MONDAY, definitions), 'morning', definitions);
    const noon = at(MONDAY, '12:00');
    expect(findOverdueTasks(noon, MONDAY, [leo], [session], definitions)).toEqual([]);
    expect(findOverdueTasks(noon, MONDAY, [leo], [initSession('leo', MONDAY, definitions)], definitions)).toHaveLength(1);

    const summary = childSummary(noon, MONDAY, leo, [session], definitions);
    expect(summary.phase?.category).toBe('after_school');
    expect(summary.next).toBe('bag');
    expect(summary.late).toEqual([]);
  });

  it('a skipped-morning day keeps the streak going', () => {
    const day = (date: string) => {
      let s = skipPhase(initSession('leo', date, definitions), 'morning', definitions);
      s = doneAll(s, s.tasks.filter((t) => t.definitionId !== 'dress').map((t) => t.definitionId));
      return s;
    };
    const stats = computeTrophyStats([day('2026-11-07'), day('2026-11-08'), day(MONDAY)], definitions);
    expect(stats.completedRoutines).toBe(3);
    expect(stats.currentStreak).toBe(3);
    expect(stats.phaseCompletions.morning).toBe(0);
  });

  it('a reset clears skipped steps', () => {
    const session = skipPhase(initSession('leo', MONDAY, definitions), 'morning', definitions);
    expect(resetSession(session).skippedPhases).toEqual([]);
  });
});
