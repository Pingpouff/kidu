import { describe, it, expect } from 'vitest';
import { ChildProfile, RoutineSession, TaskDefinition } from '../domain/models';
import { definitionsForChild, initSession, isTaskForChild, syncSessionWithDefinitions, unassignChild } from '../domain/routine';
import { dueTimeToEpoch, findOverdueTasks } from '../domain/reminders';
import { childSummary, liveStreak, upcomingDeadlines } from '../domain/summary';
import { parseBackup } from '../domain/backup';

const DATE = '2026-11-09';
const at = (hhmm: string) => dueTimeToEpoch(DATE, hhmm);

const leo: ChildProfile = { id: 'leo', name: 'Léo', avatar: '🦊', color: 'indigo', stars: 0, starProgress: 1 };
const emma: ChildProfile = { id: 'emma', name: 'Emma', avatar: '🐼', color: 'rose', stars: 0 };

const defs: TaskDefinition[] = [
  { id: 'snack', labelKey: '', defaultLabel: 'Goûter', icon: '🍪', order: 1, category: 'after_school' },
  { id: 'homework', labelKey: '', defaultLabel: 'Devoirs', icon: '✏️', order: 2, category: 'after_school', dueTime: '18:30', assignedTo: ['leo'] },
  { id: 'bath', labelKey: '', defaultLabel: 'Bain', icon: '🛁', order: 3, category: 'after_school', dueTime: '19:00' },
  { id: 'teeth', labelKey: '', defaultLabel: 'Dents', icon: '🪥', order: 1, category: 'bedtime', dueTime: '20:00', assignedTo: ['leo', 'emma'] },
];

const withStatus = (session: RoutineSession, statuses: Record<string, 'todo' | 'doing' | 'done'>): RoutineSession => ({
  ...session,
  tasks: session.tasks.map((t) => ({ ...t, status: statuses[t.definitionId] ?? t.status })),
});

describe('Tasks assigned to a child', () => {
  it('common tasks belong to everyone, assigned ones only to the listed children', () => {
    expect(isTaskForChild(defs[0], 'emma')).toBe(true);
    expect(isTaskForChild(defs[1], 'leo')).toBe(true);
    expect(isTaskForChild(defs[1], 'emma')).toBe(false);
    expect(isTaskForChild({ ...defs[1], assignedTo: [] }, 'emma')).toBe(true);
    expect(definitionsForChild(defs, 'emma').map((d) => d.id)).toEqual(['snack', 'bath', 'teeth']);
  });

  it('builds and syncs each child session with their own tasks', () => {
    expect(initSession('leo', DATE, defs).tasks.map((t) => t.definitionId)).toEqual(['snack', 'homework', 'bath', 'teeth']);
    const emmaSession = withStatus(initSession('emma', DATE, defs), { snack: 'done' });
    expect(emmaSession.tasks.map((t) => t.definitionId)).toEqual(['snack', 'bath', 'teeth']);

    // Bath becomes Léo-only: it leaves Emma's session, her snack stays done
    const synced = syncSessionWithDefinitions(emmaSession, defs.map((d) => (d.id === 'bath' ? { ...d, assignedTo: ['leo'] } : d)));
    expect(synced.tasks.map((t) => [t.definitionId, t.status])).toEqual([['snack', 'done'], ['teeth', 'todo']]);
  });

  it('only reminds the children a task is assigned to', () => {
    const overdue = findOverdueTasks(at('18:45'), DATE, [leo, emma], [], defs);
    expect(overdue.map((t) => `${t.childId}:${t.definitionId}`)).toEqual(['leo:homework']);
  });

  it('drops a deleted child from assignments and reports tasks left without anyone', () => {
    const { updated, orphans } = unassignChild(defs, 'leo');
    expect(orphans).toEqual(['homework']);
    expect(updated).toEqual([{ ...defs[3], assignedTo: ['emma'] }]);
  });

  it('keeps assignments in backups', () => {
    const file = JSON.stringify({
      app: 'kidu',
      version: 1,
      exportedAt: '',
      data: { settings: { parentPin: '1234', language: 'fr', rewards: { starsPerCompletion: 1, weeklyGoal: 5 } }, tasks: defs, profiles: [leo, emma] },
    });
    const parsed = parseBackup(file);
    expect(parsed.data.tasks.find((t) => t.id === 'homework')?.assignedTo).toEqual(['leo']);
    expect(parsed.data.tasks.find((t) => t.id === 'snack')?.assignedTo).toBeUndefined();
    const bad = file.replace('"assignedTo":["leo"]', '"assignedTo":"leo"');
    expect(() => parseBackup(bad)).toThrow();
  });
});

describe('Selection screen summary', () => {
  it('describes a child who has not started', () => {
    const s = childSummary(at('18:10'), DATE, emma, [], defs);
    expect(s).toMatchObject({ status: 'not_started', done: 0, total: 3, next: 'snack', late: [], doing: [] });
    expect(s.phase).toMatchObject({ category: 'after_school', done: 0, total: 2, index: 0, count: 2 });
    expect(s.upcoming).toMatchObject({ definitionId: 'bath', dueTime: '19:00' });
    expect(s.starsToMedal).toBe(3);
  });

  it('describes a child in progress, with late and doing tasks', () => {
    const session = withStatus(initSession('leo', DATE, defs), { snack: 'done', bath: 'doing' });
    const s = childSummary(at('18:45'), DATE, leo, [session], defs);
    expect(s).toMatchObject({ status: 'in_progress', done: 1, total: 4, doing: ['bath'], next: 'homework', late: ['homework'] });
    expect(s.upcoming).toMatchObject({ definitionId: 'bath', dueTime: '19:00' });
    expect(s.starsToMedal).toBe(2); // starProgress 1 of 3
  });

  it('describes a completed routine and a live streak', () => {
    const done = withStatus(initSession('emma', DATE, defs), { snack: 'done', bath: 'done', teeth: 'done' });
    const yesterday = { ...done, id: 'y', date: '2026-11-08' };
    const s = childSummary(at('20:30'), DATE, emma, [{ ...done, isCompleted: true, completedAt: at('19:50') }, { ...yesterday, isCompleted: true }], defs);
    expect(s).toMatchObject({ status: 'completed', done: 3, total: 3, late: [], streak: 2, completedAt: at('19:50') });
    expect(s.upcoming).toBeUndefined();
  });

  it('only counts a streak that is still alive', () => {
    expect(liveStreak(['2026-11-07', '2026-11-08'], DATE)).toBe(2);
    expect(liveStreak(['2026-11-05', '2026-11-06'], DATE)).toBe(0);
    expect(liveStreak([], DATE)).toBe(0);
  });

  it('lists the next deadlines of the evening, children grouped', () => {
    const leoSession = withStatus(initSession('leo', DATE, defs), { bath: 'done' });
    const next = upcomingDeadlines(at('18:00'), DATE, [leo, emma], [leoSession], defs);
    expect(next.map((d) => [d.dueTime, d.definitionId, d.childIds])).toEqual([
      ['18:30', 'homework', ['leo']],
      ['19:00', 'bath', ['emma']],
      ['20:00', 'teeth', ['leo', 'emma']],
    ]);
    expect(upcomingDeadlines(at('20:01'), DATE, [leo, emma], [], defs)).toEqual([]);
  });
});
