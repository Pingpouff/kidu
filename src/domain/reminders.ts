import { ChildProfile, ReminderSettings, RoutineSession, TaskDefinition } from './models';
import { isTaskForChild, sortDefinitions } from './routine';

/** A task of a child that is past its due time and not done yet. */
export interface OverdueTask {
  key: string; // `${date}_${childId}_${definitionId}`, stable for the whole day
  childId: string;
  definitionId: string;
  dueTime: string; // "HH:MM"
  dueAt: number; // epoch of today's due time
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
 * Decides which overdue tasks must be announced now, grouped by child (one
 * announcement per child, children in order of their earliest overdue task),
 * and returns the updated log. A task is announced the first time it is overdue,
 * then every `repeatMinutes`, at most `maxReminders` times per day.
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
    const due =
      (entry?.count ?? 0) < settings.maxReminders && (!entry || now - entry.lastAt >= repeatMs);
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
