import { describe, it, expect } from 'vitest';
import { CalendarPeriod, ChildProfile, RoutineSession, TaskDefinition } from '../domain/models';
import { dayContext, isTaskForSchedule, isValidPeriod, periodApplies, prunePeriods, upcomingPeriods } from '../domain/calendar';
import { initSession, syncSessionWithDefinitions } from '../domain/routine';
import { dueTimeToEpoch, findReminderTasks } from '../domain/reminders';
import { computeTrophyStats, currentStreak } from '../domain/trophies';
import { childSummary, liveStreak } from '../domain/summary';
import { parseBackup } from '../domain/backup';

const leo: ChildProfile = { id: 'leo', name: 'Léo', avatar: '🦊', color: 'indigo', stars: 0 };
const emma: ChildProfile = { id: 'emma', name: 'Emma', avatar: '🐼', color: 'rose', stars: 0 };

const defs: TaskDefinition[] = [
  { id: 'bag', labelKey: '', defaultLabel: 'Cartable', icon: '🎒', order: 1, category: 'after_school', schedule: 'school', dueTime: '17:00' },
  { id: 'pool', labelKey: '', defaultLabel: 'Piscine', icon: '🏊', order: 2, category: 'after_school', schedule: 'holidays' },
  { id: 'teeth', labelKey: '', defaultLabel: 'Dents', icon: '🪥', order: 1, category: 'bedtime', dueTime: '20:00' },
];

const holidays: CalendarPeriod = { id: 'h', kind: 'holidays', from: '2026-12-19', to: '2027-01-04' };
const leoOff: CalendarPeriod = { id: 'o', kind: 'off', from: '2026-11-10', to: '2026-11-10', childIds: ['leo'] };

describe('Holidays and rest days', () => {
  it('knows which periods cover a day, for which child', () => {
    expect(periodApplies(holidays, '2026-12-19', 'leo')).toBe(true);
    expect(periodApplies(holidays, '2027-01-05', 'leo')).toBe(false);
    expect(dayContext([holidays, leoOff], '2026-11-10', 'leo')).toEqual({ holidays: true, off: true });
    expect(dayContext([holidays, leoOff], '2026-11-10', 'emma')).toEqual({ holidays: false, off: false });
    expect(dayContext([holidays], '2026-12-25', 'emma')).toEqual({ holidays: true, off: false });
  });

  it('shows school tasks on school days and holiday tasks in holidays', () => {
    expect(isTaskForSchedule(defs[0], false)).toBe(true);
    expect(isTaskForSchedule(defs[0], true)).toBe(false);
    expect(isTaskForSchedule(defs[1], true)).toBe(true);
    expect(isTaskForSchedule(defs[2], true)).toBe(true);
    const ids = (s: RoutineSession) => s.tasks.map((t) => t.definitionId);
    expect(ids(initSession('leo', '2026-12-14', defs, [holidays]))).toEqual(['bag', 'teeth']);
    expect(ids(initSession('leo', '2026-12-21', defs, [holidays]))).toEqual(['pool', 'teeth']);
    // Adding holidays today updates the routine already started
    const today = initSession('leo', '2026-12-21', defs);
    expect(ids(syncSessionWithDefinitions(today, defs, [holidays]))).toEqual(['pool', 'teeth']);
  });

  it('a rest day stops every reminder of that child only', () => {
    const now = dueTimeToEpoch('2026-11-10', '21:00');
    const kids = findReminderTasks(now, '2026-11-10', [leo, emma], [], defs, { periods: [leoOff] }).map((t) => t.childId);
    expect(kids).not.toContain('leo');
    expect(kids).toContain('emma');
  });

  it('a rest day neither counts nor breaks a streak', () => {
    const isOff = (d: string) => d === '2026-11-10';
    expect(currentStreak(['2026-11-09', '2026-11-11'])).toBe(1);
    expect(currentStreak(['2026-11-08', '2026-11-09', '2026-11-11'], isOff)).toBe(3);
    expect(liveStreak(['2026-11-09'], '2026-11-11', isOff)).toBe(1);
    expect(liveStreak(['2026-11-09'], '2026-11-11')).toBe(0);
    const done = (date: string): RoutineSession => ({ id: `${date}_leo`, childId: 'leo', date, tasks: [], isCompleted: true });
    expect(computeTrophyStats([done('2026-11-08'), done('2026-11-09'), done('2026-11-11')], defs, undefined, isOff).currentStreak).toBe(3);
  });

  it('tells the selection screen about today', () => {
    const now = dueTimeToEpoch('2026-11-10', '18:00');
    const settings = { parentPin: '1234', language: 'fr' as const, rewards: { starsPerCompletion: 1, weeklyGoal: 5 }, periods: [leoOff] };
    const summary = childSummary(now, '2026-11-10', leo, [], defs, settings);
    expect(summary.period).toBe('off');
    expect(summary.late).toEqual([]);
    expect(childSummary(now, '2026-11-10', emma, [], defs, settings).period).toBeUndefined();
  });

  it('validates, sorts and prunes periods', () => {
    expect(isValidPeriod({ kind: 'off', from: '2026-11-10', to: '2026-11-09' })).toBe(false);
    expect(isValidPeriod({ kind: 'holidays', from: '2026-11-10', to: '2026-11-10' })).toBe(true);
    const old: CalendarPeriod = { id: 'old', kind: 'holidays', from: '2026-07-01', to: '2026-08-31' };
    expect(upcomingPeriods([holidays, old, leoOff], '2026-11-10').map((p) => p.id)).toEqual(['o', 'h']);
    expect(prunePeriods([old, holidays], '2026-11-10').map((p) => p.id)).toEqual(['h']);
  });

  it('keeps periods and task schedules in backups', () => {
    const file = JSON.stringify({
      app: 'kidu',
      version: 2,
      data: {
        settings: { parentPin: '1234', language: 'fr', rewards: { starsPerCompletion: 1, weeklyGoal: 5 }, periods: [holidays, leoOff] },
        tasks: defs,
        profiles: [],
      },
    });
    const parsed = parseBackup(file).data;
    expect(parsed.settings.periods).toEqual([holidays, leoOff]);
    expect(parsed.tasks.map((t) => t.schedule)).toEqual(['school', 'holidays', undefined]);
    expect(() => parseBackup(file.replace('"kind":"off"', '"kind":"party"'))).toThrow();
    expect(() => parseBackup(file.replace('"schedule":"school"', '"schedule":"weekend"'))).toThrow();
  });
});
