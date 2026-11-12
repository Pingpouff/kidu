import { describe, it, expect } from 'vitest';
import { ChildProfile, ReminderSettings, RoutineSession, TaskDefinition } from '../domain/models';
import {
  dueTimeToEpoch,
  findOverdueTasks,
  findReminderTasks,
  findStartingTasks,
  isValidDueTime,
  isValidTimeWindow,
  isMuted,
  muteReminders,
  mutedChildren,
  planReminders,
  pruneReminderLog,
  ReminderLog,
} from '../domain/reminders';
import { ReminderQueue, Announcement } from '../services/ReminderQueue';
import { reminderText } from '../hooks/useTaskReminders';

const DATE = '2026-11-09';
const at = (hhmm: string) => dueTimeToEpoch(DATE, hhmm);

const profiles: ChildProfile[] = [
  { id: 'leo', name: 'Léo', avatar: '🦊', color: 'indigo', stars: 0 },
  { id: 'emma', name: 'Emma', avatar: '🐼', color: 'rose', stars: 0 },
];

const definitions: TaskDefinition[] = [
  { id: 'homework', labelKey: '', defaultLabel: 'Devoirs', icon: '✏️', order: 1, dueTime: '18:30' },
  { id: 'bath', labelKey: '', defaultLabel: 'Bain', icon: '🛁', order: 2, dueTime: '18:30' },
  { id: 'teeth', labelKey: '', defaultLabel: 'Dents', icon: '🪥', order: 3, dueTime: '20:00' },
  { id: 'story', labelKey: '', defaultLabel: 'Histoire', icon: '📖', order: 4 }, // no due time
];

const session = (childId: string, done: string[], isCompleted = false): RoutineSession => ({
  id: `${DATE}_${childId}`,
  childId,
  date: DATE,
  isCompleted,
  tasks: definitions.map((d) => ({
    id: `${childId}_${d.id}`,
    definitionId: d.id,
    status: done.includes(d.id) ? 'done' : 'todo',
  })),
});

const settings: ReminderSettings = { enabled: true, repeatMinutes: 5, maxReminders: 3, systemNotifications: false };

describe('Overdue detection', () => {
  it('validates HH:MM due times', () => {
    expect(isValidDueTime('18:30')).toBe(true);
    expect(isValidDueTime('8:30')).toBe(false);
    expect(isValidDueTime('24:00')).toBe(false);
    expect(isValidDueTime(undefined)).toBe(false);
  });

  it('lists tasks past their due time and not done, for every child', () => {
    const overdue = findOverdueTasks(at('18:45'), DATE, profiles, [session('leo', ['homework'])], definitions);
    // Léo: bath late (homework done, teeth not due yet). Emma has no session yet: homework + bath late.
    expect(overdue.map((t) => `${t.childId}:${t.definitionId}`)).toEqual([
      'leo:bath',
      'emma:homework',
      'emma:bath',
    ]);
  });

  it('ignores tasks without due time, tasks not due yet and completed routines', () => {
    expect(findOverdueTasks(at('18:29'), DATE, profiles, [], definitions)).toEqual([]);
    const all = definitions.map((d) => d.id);
    const overdue = findOverdueTasks(at('23:00'), DATE, profiles, [session('leo', all, true), session('emma', ['homework', 'bath', 'teeth'])], definitions);
    expect(overdue).toEqual([]);
  });

  it('sorts by due time first', () => {
    const overdue = findOverdueTasks(at('20:10'), DATE, [profiles[0]], [session('leo', ['bath'])], definitions);
    expect(overdue.map((t) => t.definitionId)).toEqual(['homework', 'teeth']);
  });
});

describe('Reminder planning', () => {
  const overdueAt = (hhmm: string) => findOverdueTasks(at(hhmm), DATE, profiles, [], definitions);

  it('groups tasks due at the same time into one announcement per child', () => {
    const { batches } = planReminders(overdueAt('18:31'), {}, at('18:31'), settings);
    expect(batches.map((b) => [b.childId, b.tasks.map((t) => t.definitionId)])).toEqual([
      ['leo', ['homework', 'bath']],
      ['emma', ['homework', 'bath']],
    ]);
  });

  it('repeats every N minutes, up to the maximum', () => {
    let log: ReminderLog = {};
    const announce = (hhmm: string) => {
      const result = planReminders(overdueAt('18:31').slice(0, 1), log, at(hhmm), settings);
      log = result.log;
      return result.batches.length;
    };
    expect(announce('18:31')).toBe(1); // 1st
    expect(announce('18:33')).toBe(0); // too soon
    expect(announce('18:36')).toBe(1); // 2nd
    expect(announce('18:41')).toBe(1); // 3rd
    expect(announce('18:50')).toBe(0); // max reached
  });

  it('announces nothing when reminders are disabled', () => {
    expect(planReminders(overdueAt('19:00'), {}, at('19:00'), { ...settings, enabled: false }).batches).toEqual([]);
  });

  it('forgets previous days', () => {
    const log = { '2026-11-08_leo_bath': { count: 3, lastAt: 1 }, [`${DATE}_leo_bath`]: { count: 1, lastAt: 2 } };
    expect(Object.keys(pruneReminderLog(log, DATE))).toEqual([`${DATE}_leo_bath`]);
  });

  it('builds a readable sentence', () => {
    expect(reminderText('Léo', ['Devoirs'], 'fr')).toBe("Léo, c'est l'heure : Devoirs !");
    expect(reminderText('Léo', ['Devoirs', 'Bain', 'Dents'], 'fr')).toBe('Léo, il reste 3 tâches en retard : Devoirs, Bain et Dents.');
  });
});

describe('Reminder queue', () => {
  type A = Announcement & { label: string };
  const merge = (a: A, b: A): A => ({
    childId: a.childId,
    taskKeys: [...new Set([...a.taskKeys, ...b.taskKeys])],
    label: `${a.label}+${b.label}`,
  });
  const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

  it('plays announcements one at a time, in order', async () => {
    let active = 0;
    let maxActive = 0;
    const played: string[] = [];
    const releases: (() => void)[] = [];
    const queue = new ReminderQueue<A>({
      merge,
      revalidate: async (a) => a,
      play: (a) => {
        active++;
        maxActive = Math.max(maxActive, active);
        played.push(a.label);
        return new Promise<void>((resolve) => releases.push(() => { active--; resolve(); }));
      },
      wait: async () => {},
    });

    queue.enqueue({ childId: 'leo', taskKeys: ['k1'], label: 'leo' });
    queue.enqueue({ childId: 'emma', taskKeys: ['k2'], label: 'emma' });
    await flush();
    expect(played).toEqual(['leo']); // emma waits for leo to finish

    releases.shift()!();
    await flush();
    await flush();
    expect(played).toEqual(['leo', 'emma']);
    releases.shift()!();
    await flush();
    expect(maxActive).toBe(1);
  });

  it('merges pending announcements of the same child', async () => {
    const played: A[] = [];
    let release: () => void = () => {};
    const queue = new ReminderQueue<A>({
      merge,
      revalidate: async (a) => a,
      play: (a) => {
        played.push(a);
        return new Promise<void>((resolve) => { release = resolve; });
      },
      wait: async () => {},
    });

    queue.enqueue({ childId: 'leo', taskKeys: ['k1'], label: 'first' });
    queue.enqueue({ childId: 'emma', taskKeys: ['k2'], label: 'emma-1' });
    queue.enqueue({ childId: 'emma', taskKeys: ['k3'], label: 'emma-2' });
    expect(queue.size).toBe(1);

    await flush();
    release();
    await flush();
    await flush();
    expect(played[1]).toMatchObject({ childId: 'emma', taskKeys: ['k2', 'k3'], label: 'emma-1+emma-2' });
    release();
  });

  it('skips announcements whose tasks were done while waiting', async () => {
    const played: string[] = [];
    const done = new Set(['k2']);
    const queue = new ReminderQueue<A>({
      merge,
      revalidate: async (a) => {
        const keys = a.taskKeys.filter((k) => !done.has(k));
        return keys.length ? { ...a, taskKeys: keys } : null;
      },
      play: async (a) => { played.push(a.label); },
      wait: async () => {},
    });

    queue.enqueue({ childId: 'leo', taskKeys: ['k1'], label: 'leo' });
    queue.enqueue({ childId: 'emma', taskKeys: ['k2'], label: 'emma' });
    queue.enqueue({ childId: 'zoe', taskKeys: ['k3'], label: 'zoe' });
    for (let i = 0; i < 6; i++) await flush();
    expect(played).toEqual(['leo', 'zoe']);
  });

  it('keeps going when one announcement fails', async () => {
    const played: string[] = [];
    const queue = new ReminderQueue<A>({
      merge,
      revalidate: async (a) => a,
      play: async (a) => {
        if (a.label === 'boom') throw new Error('speech failed');
        played.push(a.label);
      },
      wait: async () => {},
    });
    const errors = console.error;
    console.error = () => {};
    queue.enqueue({ childId: 'leo', taskKeys: ['k1'], label: 'boom' });
    queue.enqueue({ childId: 'emma', taskKeys: ['k2'], label: 'emma' });
    for (let i = 0; i < 6; i++) await flush();
    console.error = errors;
    expect(played).toEqual(['emma']);
  });
});

describe('Start times', () => {
  const windowDefs: TaskDefinition[] = [
    { id: 'homework', labelKey: '', defaultLabel: 'Devoirs', icon: '✏️', order: 1, startTime: '18:15', dueTime: '18:45' },
    { id: 'bath', labelKey: '', defaultLabel: 'Bain', icon: '🛁', order: 2, startTime: '18:30' },
  ];
  const sessionWith = (childId: string, statuses: Record<string, 'todo' | 'doing' | 'done'>): RoutineSession => ({
    id: `${DATE}_${childId}`,
    childId,
    date: DATE,
    isCompleted: false,
    tasks: windowDefs.map((d) => ({ id: `${childId}_${d.id}`, definitionId: d.id, status: statuses[d.id] ?? 'todo' })),
  });

  it('checks that the start is before the end', () => {
    expect(isValidTimeWindow('18:00', '18:30')).toBe(true);
    expect(isValidTimeWindow('18:30', '18:30')).toBe(false);
    expect(isValidTimeWindow('19:00', '18:30')).toBe(false);
    expect(isValidTimeWindow('18:00', undefined)).toBe(true);
    expect(isValidTimeWindow(undefined, '18:00')).toBe(true);
    expect(isValidTimeWindow('8:00', undefined)).toBe(false);
  });

  it('lists tasks whose start time has passed and that are not started', () => {
    const starting = findStartingTasks(at('18:35'), DATE, profiles, [sessionWith('leo', { homework: 'doing' })], windowDefs);
    expect(starting.map((t) => `${t.childId}:${t.definitionId}:${t.kind}`)).toEqual([
      'emma:homework:start',
      'leo:bath:start',
      'emma:bath:start',
    ]);
    expect(findStartingTasks(at('18:10'), DATE, profiles, [], windowDefs)).toEqual([]);
  });

  it('hands over to late reminders once the end time has passed', () => {
    const all = findReminderTasks(at('18:50'), DATE, [profiles[0]], [], windowDefs);
    expect(all.map((t) => `${t.definitionId}:${t.kind}`)).toEqual(['bath:start', 'homework:late']); // by time: 18:30, 18:45
  });

  it('announces a start only once', () => {
    let log: ReminderLog = {};
    const tasks = findStartingTasks(at('18:20'), DATE, [profiles[0]], [], windowDefs);
    const first = planReminders(tasks, log, at('18:20'), settings);
    log = first.log;
    expect(first.batches).toHaveLength(1);
    expect(planReminders(tasks, log, at('18:40'), settings).batches).toEqual([]);
  });

  it('says it is time to start, alone or after late tasks', () => {
    expect(reminderText('Léo', [], 'fr', ['Bain'])).toBe("Léo, c'est le moment de commencer : Bain !");
    expect(reminderText('Léo', ['Devoirs'], 'fr', ['Bain', 'Dents'])).toBe(
      "Léo, c'est l'heure : Devoirs ! Et c'est le moment de commencer : Bain et Dents !"
    );
    expect(reminderText('Leo', [], 'en', ['Bath'])).toBe('Leo, time to start: Bath!');
  });
});

describe('Reminders stopped for tonight', () => {
  it('a stopped child gets no reminder until the next day', () => {
    const now = at('21:00');
    const muted = muteReminders(undefined, DATE, ['leo']);
    expect(isMuted(muted, DATE, 'leo')).toBe(true);
    expect(isMuted(muted, DATE, 'emma')).toBe(false);
    expect(isMuted(muted, '2026-11-10', 'leo')).toBe(false); // tomorrow starts normally
    const kids = findReminderTasks(now, DATE, profiles, [], definitions, { muted }).map((t) => t.childId);
    expect(kids).not.toContain('leo');
    expect(kids).toContain('emma');
    expect(findOverdueTasks(now, DATE, profiles, [], definitions, { muted: muteReminders(muted, DATE) })).toEqual([]);

    // Adding a child, then everyone; yesterday's list is forgotten
    expect(muteReminders(muted, DATE, ['emma'])).toEqual({ date: DATE, childIds: ['leo', 'emma'] });
    expect(muteReminders({ date: DATE }, DATE, ['emma'])).toEqual({ date: DATE });
    expect(muteReminders({ date: '2026-11-08', childIds: ['leo'] }, DATE, ['emma'])).toEqual({ date: DATE, childIds: ['emma'] });
    expect(mutedChildren({ date: DATE }, DATE, profiles)).toEqual({ all: true, ids: ['leo', 'emma'] });
  });
});
