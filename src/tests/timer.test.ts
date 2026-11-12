import { describe, it, expect } from 'vitest';
import { ChildProfile, DEFAULT_REMINDERS, RoutineSession, TaskDefinition } from '../domain/models';
import { initSession, moveTask, syncSessionWithDefinitions } from '../domain/routine';
import { isValidDuration, minutesLeft, parseDuration, timerState, warningsFor } from '../domain/timer';
import { dueTimeToEpoch, findReminderTasks, findTimerTasks, planReminders } from '../domain/reminders';
import { parseBackup } from '../domain/backup';
import { reminderText } from '../hooks/useTaskReminders';

const DATE = '2026-11-09';
const at = (hhmm: string) => dueTimeToEpoch(DATE, hhmm);
const MIN = 60_000;

const leo: ChildProfile = { id: 'leo', name: 'Léo', avatar: '🦊', color: 'indigo', stars: 0 };
const defs: TaskDefinition[] = [
  { id: 'meal', labelKey: '', defaultLabel: 'Manger', icon: '🍽️', order: 1, category: 'meal', durationMinutes: 30 },
  { id: 'teeth', labelKey: '', defaultLabel: 'Dents', icon: '🪥', order: 1, category: 'bedtime' },
];

/** Léo starts the meal at 19:00 */
const started = (): RoutineSession => {
  const s = initSession('leo', DATE, defs);
  return moveTask(s, s.tasks[0].id, 'doing', defs, at('19:00'));
};

describe('Timed tasks', () => {
  it('records when a task is started, keeps it when done, clears it back to todo', () => {
    const s = started();
    expect(s.tasks[0].startedAt).toBe(at('19:00'));
    const done = moveTask(s, s.tasks[0].id, 'done', defs, at('19:20'));
    expect(done.tasks[0].startedAt).toBe(at('19:00'));
    const back = moveTask(done, done.tasks[0].id, 'todo', defs, at('19:21'));
    expect(back.tasks[0].startedAt).toBeUndefined();
    // Survives a task-list sync
    expect(syncSessionWithDefinitions(s, defs).tasks[0].startedAt).toBe(at('19:00'));
  });

  it('counts down from the start of the task', () => {
    const task = started().tasks[0];
    expect(timerState(defs[0], { ...task, status: 'todo' }, at('19:10'))).toBeUndefined();
    expect(timerState(defs[1], task, at('19:10'))).toBeUndefined(); // not timed
    const state = timerState(defs[0], task, at('19:10'))!;
    expect(state.endsAt).toBe(at('19:30'));
    expect(state.remainingMs).toBe(20 * MIN);
    expect(state.fraction).toBeCloseTo(2 / 3);
    expect(state.expired).toBe(false);
    expect(timerState(defs[0], task, at('19:45'))).toMatchObject({ remainingMs: 0, fraction: 0, expired: true });
    expect(minutesLeft(4 * MIN + 1)).toBe(5);
  });

  it('validates durations and keeps only useful warnings', () => {
    expect(isValidDuration(30)).toBe(true);
    expect(isValidDuration(0)).toBe(false);
    expect(isValidDuration(2.5)).toBe(false);
    expect(isValidDuration(500)).toBe(false);
    expect(parseDuration('')).toBeUndefined();
    expect(parseDuration('15')).toBe(15);
    expect(parseDuration('abc')).toBeUndefined();
    expect(warningsFor(undefined, 30)).toEqual([10, 5]);
    expect(warningsFor({ timerWarnings: [5, 15, 10] }, 10)).toEqual([5]);
  });

  it('warns before the end (closest threshold only), then when time is up', () => {
    const sessions = [started()];
    const find = (hhmm: string) => findTimerTasks(at(hhmm), DATE, [leo], sessions, defs, { timerWarnings: [10, 5] });
    expect(find('19:15')).toEqual([]);
    expect(find('19:21')).toMatchObject([{ kind: 'warning', minutesLeft: 9, dueTime: '19:30' }]);
    expect(find('19:21')[0].key).toMatch(/_w10$/);
    expect(find('19:26')[0]).toMatchObject({ kind: 'warning', minutesLeft: 4 });
    expect(find('19:26')[0].key).toMatch(/_w5$/);
    expect(find('19:31')).toMatchObject([{ kind: 'timeup', definitionId: 'meal' }]);
    // Part of everything to announce
    expect(findReminderTasks(at('19:31'), DATE, [leo], sessions, defs).map((t) => t.kind)).toEqual(['timeup']);
  });

  it('gives no timer reminder once done, skipped, or the day is completed', () => {
    const s = started();
    const done = moveTask(s, s.tasks[0].id, 'done', defs, at('19:10'));
    expect(findTimerTasks(at('19:31'), DATE, [leo], [done], defs)).toEqual([]);
    expect(findTimerTasks(at('19:31'), DATE, [leo], [{ ...s, skippedPhases: ['meal'] }], defs)).toEqual([]);
    expect(findTimerTasks(at('19:31'), DATE, [leo], [{ ...s, isCompleted: true }], defs)).toEqual([]);
  });

  it('a restarted task gets fresh reminders', () => {
    const first = findTimerTasks(at('19:31'), DATE, [leo], [started()], defs)[0].key;
    const s = started();
    const again = moveTask(moveTask(s, s.tasks[0].id, 'todo', defs, at('19:32')), s.tasks[0].id, 'doing', defs, at('19:33'));
    const second = findTimerTasks(at('20:04'), DATE, [leo], [again], defs)[0].key;
    expect(second).not.toBe(first);
  });

  it('announces a warning once, and "time is up" like a late task', () => {
    const settings = { ...DEFAULT_REMINDERS, repeatMinutes: 5, maxReminders: 2 };
    const sessions = [started()];
    const warn = findTimerTasks(at('19:21'), DATE, [leo], sessions, defs);
    const first = planReminders(warn, {}, at('19:21'), settings);
    expect(first.batches).toHaveLength(1);
    expect(planReminders(warn, first.log, at('19:40'), settings).batches).toEqual([]);

    const up = findTimerTasks(at('19:31'), DATE, [leo], sessions, defs);
    let log = planReminders(up, {}, at('19:31'), settings).log;
    const repeat = planReminders(up, log, at('19:36'), settings);
    expect(repeat.batches).toHaveLength(1);
    log = repeat.log;
    expect(planReminders(up, log, at('19:41'), settings).batches).toEqual([]); // max 2
  });

  it('says how many minutes are left, or that time is up', () => {
    expect(reminderText('Léo', [], 'fr', [], { warnings: [{ label: 'Manger', minutes: 5 }], timeUp: [] })).toBe(
      'Léo, plus que 5 minutes pour : Manger !'
    );
    expect(reminderText('Léo', [], 'fr', [], { warnings: [{ label: 'Manger', minutes: 1 }], timeUp: [] })).toBe(
      "Léo, plus qu'une minute pour : Manger !"
    );
    expect(reminderText('Léo', ['Dents'], 'fr', [], { warnings: [], timeUp: ['Manger'] })).toBe(
      "Léo, c'est l'heure : Dents ! Le temps est écoulé pour : Manger. On termine !"
    );
    expect(reminderText('Leo', [], 'en', [], { warnings: [{ label: 'Dinner', minutes: 10 }], timeUp: [] })).toBe(
      'Leo, only 10 minutes left for: Dinner!'
    );
  });

  it('keeps durations and warnings in backups', () => {
    const file = JSON.stringify({
      app: 'kidu',
      version: 2,
      data: {
        settings: {
          parentPin: '1234',
          language: 'fr',
          rewards: { starsPerCompletion: 1, weeklyGoal: 5 },
          reminders: { ...DEFAULT_REMINDERS, timerWarnings: [15, 5] },
        },
        tasks: defs,
        profiles: [],
      },
    });
    const parsed = parseBackup(file).data;
    expect(parsed.tasks[0].durationMinutes).toBe(30);
    expect(parsed.settings.reminders?.timerWarnings).toEqual([15, 5]);
    expect(() => parseBackup(file.replace('"durationMinutes":30', '"durationMinutes":-3'))).toThrow();
  });
});
