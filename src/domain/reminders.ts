import { ChildProfile, ReminderSettings, RoutineSession, TaskDefinition } from './models';
import { isTaskForChild, sortDefinitions } from './routine';

/**
 * A task of a child that needs a reminder: either past its end time and not
 * done (`late`), or past its start time and not started yet (`start`).
 */
export interface OverdueTask {
  key: string; // `${date}_${childId}_${definitionId}` (+ `_start`), stable for the whole day
  childId: string;
  definitionId: string;
  dueTime: string; // "HH:MM" that triggered it: end time (late) or start time (start)
  dueAt: number; // epoch of that time today
  kind?: 'late' | 'start'; // missing = late
}

/** How many times a task was announced today, and when last. */
export interface ReminderLog {
  [key: string]: { count: number; lastAt: number };
}

/** One announcement: all the overdue tasks of a child that are due for a reminder now. */
export interface ReminderBatch {
  childId: string;
  tasks: OverdueTask[];
}

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const isValidDueTime = (value: unknown): value is string =>
  typeof value === 'string' && TIME_RE.test(value);

/** Start and end times are consistent: both optional, and start before end when both are set. */
export function isValidTimeWindow(startTime: string | undefined, dueTime: string | undefined): boolean {
  if (startTime && !isValidDueTime(startTime)) return false;
  if (dueTime && !isValidDueTime(dueTime)) return false;
  return !(startTime && dueTime) || startTime < dueTime;
}

/** Epoch of `HH:MM` on the given local day (YYYY-MM-DD). */
export function dueTimeToEpoch(date: string, dueTime: string): number {
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = dueTime.split(':').map(Number);
  return new Date(y, m - 1, d, hh, mm).getTime();
}

/**
 * Lists every task past its due time that isn't done, for every child.
 * A child without a session today has not started: all their due tasks count.
 * Children whose routine is completed get no reminder.
 * Sorted by due time, then by child order.
 */
export function findOverdueTasks(
  now: number,
  date: string,
  profiles: ChildProfile[],
  sessions: RoutineSession[],
  definitions: TaskDefinition[]
): OverdueTask[] {
  // Routine order, so tasks due at the same time are announced in the order they are done
  const timed = sortDefinitions(definitions).filter((d) => isValidDueTime(d.dueTime));
  const result: (OverdueTask & { childIndex: number })[] = [];

  profiles.forEach((profile, childIndex) => {
    const session = sessions.find((s) => s.childId === profile.id && s.date === date);
    if (session?.isCompleted) return;

    for (const def of timed) {
      if (!isTaskForChild(def, profile.id)) continue;
      const dueAt = dueTimeToEpoch(date, def.dueTime!);
      if (dueAt > now) continue;
      const task = session?.tasks.find((t) => t.definitionId === def.id);
      if (task?.status === 'done') continue;
      result.push({
        key: `${date}_${profile.id}_${def.id}`,
        childId: profile.id,
        definitionId: def.id,
        dueTime: def.dueTime!,
        dueAt,
        kind: 'late',
        childIndex,
      });
    }
  });

  return result
    .sort((a, b) => a.dueAt - b.dueAt || a.childIndex - b.childIndex)
    .map((task) => {
      const copy: OverdueTask & { childIndex?: number } = { ...task };
      delete copy.childIndex;
      return copy;
    });
}

/**
 * Tasks whose start time has passed but that the child has not started yet
 * ("todo"), for every child. Once a task is late, the late reminders take over.
 * Sorted by start time, then by child order.
 */
export function findStartingTasks(
  now: number,
  date: string,
  profiles: ChildProfile[],
  sessions: RoutineSession[],
  definitions: TaskDefinition[]
): OverdueTask[] {
  const timed = sortDefinitions(definitions).filter((d) => isValidDueTime(d.startTime));
  const result: (OverdueTask & { childIndex: number })[] = [];

  profiles.forEach((profile, childIndex) => {
    const session = sessions.find((s) => s.childId === profile.id && s.date === date);
    if (session?.isCompleted) return;

    for (const def of timed) {
      if (!isTaskForChild(def, profile.id)) continue;
      const startAt = dueTimeToEpoch(date, def.startTime!);
      if (startAt > now) continue;
      if (isValidDueTime(def.dueTime) && dueTimeToEpoch(date, def.dueTime) <= now) continue;
      const task = session?.tasks.find((t) => t.definitionId === def.id);
      if (session && (!task || task.status !== 'todo')) continue;
      result.push({
        key: `${date}_${profile.id}_${def.id}_start`,
        childId: profile.id,
        definitionId: def.id,
        dueTime: def.startTime!,
        dueAt: startAt,
        kind: 'start',
        childIndex,
      });
    }
  });

  return result
    .sort((a, b) => a.dueAt - b.dueAt || a.childIndex - b.childIndex)
    .map((task) => {
      const copy: OverdueTask & { childIndex?: number } = { ...task };
      delete copy.childIndex;
      return copy;
    });
}

/** Everything to announce now: late tasks and tasks to start, by time then child. */
export function findReminderTasks(
  now: number,
  date: string,
  profiles: ChildProfile[],
  sessions: RoutineSession[],
  definitions: TaskDefinition[]
): OverdueTask[] {
  const order = new Map(profiles.map((p, i) => [p.id, i]));
  return [
    ...findOverdueTasks(now, date, profiles, sessions, definitions),
    ...findStartingTasks(now, date, profiles, sessions, definitions),
  ].sort((a, b) => a.dueAt - b.dueAt || (order.get(a.childId) ?? 0) - (order.get(b.childId) ?? 0));
}

/**
 * Decides which overdue tasks must be announced now, grouped by child (one
 * announcement per child, children in order of their earliest overdue task),
 * and returns the updated log. A task is announced the first time it is overdue,
 * then every `repeatMinutes`, at most `maxReminders` times per day.
 * A "time to start" reminder is announced only once.
 */
export function planReminders(
  overdue: OverdueTask[],
  log: ReminderLog,
  now: number,
  settings: ReminderSettings
): { batches: ReminderBatch[]; log: ReminderLog } {
  if (!settings.enabled) return { batches: [], log };

  const repeatMs = Math.max(1, settings.repeatMinutes) * 60_000;
  const nextLog: ReminderLog = { ...log };
  const batches: ReminderBatch[] = [];

  for (const task of overdue) {
    const entry = log[task.key];
    const max = task.kind === 'start' ? 1 : settings.maxReminders;
    const due = (entry?.count ?? 0) < max && (!entry || now - entry.lastAt >= repeatMs);
    if (!due) continue;

    nextLog[task.key] = { count: (entry?.count ?? 0) + 1, lastAt: now };
    const batch = batches.find((b) => b.childId === task.childId);
    if (batch) batch.tasks.push(task);
    else batches.push({ childId: task.childId, tasks: [task] });
  }

  return { batches, log: nextLog };
}

/** Removes log entries from previous days. */
export function pruneReminderLog(log: ReminderLog, date: string): ReminderLog {
  return Object.fromEntries(Object.entries(log).filter(([key]) => key.startsWith(`${date}_`)));
}
