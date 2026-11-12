import { CalendarPeriod, ChildProfile, MutedReminders, ReminderSettings, RoutineSession, TaskDefinition } from './models';
import { getTaskCategory, isTaskForChildOn, sortDefinitions } from './routine';
import { isDayOff } from './calendar';
import { isValidDuration, minutesLeft, timerState, warningsFor } from './timer';

export type ReminderKind = 'late' | 'start' | 'warning' | 'timeup';

/**
 * A task of a child that needs a reminder: past its end time and not done
 * (`late`), past its start time and not started yet (`start`), or a timed task
 * in progress that is about to run out (`warning`) or has run out (`timeup`).
 */
export interface OverdueTask {
  key: string; // `${date}_${childId}_${definitionId}` (+ `_start`, `_t…`), stable for the whole day
  childId: string;
  definitionId: string;
  dueTime: string; // "HH:MM" that triggered it: end time (late), start time (start), end of the time allowed (warning, timeup)
  dueAt: number; // epoch of that moment
  kind?: ReminderKind; // missing = late
  minutesLeft?: number; // warning: minutes left
}

/** What the reminders need beside the routine itself. */
export interface ReminderContext {
  /** Holidays and rest days: a rest day raises no reminder, school tasks vanish in holidays */
  periods?: CalendarPeriod[];
  /** "Minutes left" warnings for timed tasks (settings.reminders.timerWarnings) */
  timerWarnings?: number[];
  /** Reminders a parent stopped for tonight (settings.mutedReminders) */
  muted?: MutedReminders;
}

/** True when a parent stopped this child's reminders for that day. */
export function isMuted(muted: MutedReminders | undefined, date: string, childId: string): boolean {
  return !!muted && muted.date === date && (!muted.childIds?.length || muted.childIds.includes(childId));
}

/** Stops the reminders of some children (none given = every child) for that day. */
export function muteReminders(muted: MutedReminders | undefined, date: string, childIds?: string[]): MutedReminders {
  if (!childIds?.length) return { date };
  const current = muted?.date === date ? muted : undefined;
  if (current && !current.childIds?.length) return current; // already everyone
  return { date, childIds: [...new Set([...(current?.childIds ?? []), ...childIds])] };
}

/** Children whose reminders are stopped that day (every child when `all`). */
export function mutedChildren(muted: MutedReminders | undefined, date: string, profiles: ChildProfile[]): { all: boolean; ids: string[] } {
  const ids = profiles.filter((p) => isMuted(muted, date, p.id)).map((p) => p.id);
  return { all: profiles.length > 0 && ids.length === profiles.length, ids };
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

const hhmm = (epoch: number) => {
  const d = new Date(epoch);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

/** Children who can get reminders today: not on a rest day, not stopped by a parent, routine not completed. */
function remindable(profiles: ChildProfile[], sessions: RoutineSession[], date: string, { periods, muted }: ReminderContext) {
  return profiles
    .map((profile, childIndex) => ({ profile, childIndex, session: sessions.find((s) => s.childId === profile.id && s.date === date) }))
    .filter(({ profile, session }) => !session?.isCompleted && !isDayOff(periods, date, profile.id) && !isMuted(muted, date, profile.id));
}

const byTimeThenChild = (a: OverdueTask & { childIndex: number }, b: OverdueTask & { childIndex: number }) =>
  a.dueAt - b.dueAt || a.childIndex - b.childIndex;

const withoutIndex = (task: OverdueTask & { childIndex?: number }): OverdueTask => {
  const copy = { ...task };
  delete copy.childIndex;
  return copy;
};

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
 * Children whose routine is completed, or on a rest day, get no reminder.
 * Sorted by due time, then by child order.
 */
export function findOverdueTasks(
  now: number,
  date: string,
  profiles: ChildProfile[],
  sessions: RoutineSession[],
  definitions: TaskDefinition[],
  context: ReminderContext = {}
): OverdueTask[] {
  const { periods } = context;
  // Routine order, so tasks due at the same time are announced in the order they are done
  const timed = sortDefinitions(definitions).filter((d) => isValidDueTime(d.dueTime));
  const result: (OverdueTask & { childIndex: number })[] = [];

  for (const { profile, childIndex, session } of remindable(profiles, sessions, date, context)) {
    for (const def of timed) {
      if (!isTaskForChildOn(def, profile.id, date, periods)) continue;
      // A step a parent skipped today raises no reminder
      if (session?.skippedPhases?.includes(getTaskCategory(def))) continue;
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
  }

  return result.sort(byTimeThenChild).map(withoutIndex);
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
  definitions: TaskDefinition[],
  context: ReminderContext = {}
): OverdueTask[] {
  const { periods } = context;
  const timed = sortDefinitions(definitions).filter((d) => isValidDueTime(d.startTime));
  const result: (OverdueTask & { childIndex: number })[] = [];

  for (const { profile, childIndex, session } of remindable(profiles, sessions, date, context)) {
    for (const def of timed) {
      if (!isTaskForChildOn(def, profile.id, date, periods)) continue;
      // A step a parent skipped today raises no reminder
      if (session?.skippedPhases?.includes(getTaskCategory(def))) continue;
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
  }

  return result.sort(byTimeThenChild).map(withoutIndex);
}

/**
 * Timed tasks in progress ("doing"): a `warning` once fewer than N minutes are
 * left (only the closest threshold passed, so two warnings never stack up),
 * then `timeup` once the time allowed has run out. Keys include the start
 * moment, so restarting a task gives it fresh reminders.
 */
export function findTimerTasks(
  now: number,
  date: string,
  profiles: ChildProfile[],
  sessions: RoutineSession[],
  definitions: TaskDefinition[],
  context: ReminderContext = {}
): OverdueTask[] {
  const { timerWarnings } = context;
  const timed = sortDefinitions(definitions).filter((d) => isValidDuration(d.durationMinutes));
  const result: (OverdueTask & { childIndex: number })[] = [];

  for (const { profile, childIndex, session } of remindable(profiles, sessions, date, context)) {
    if (!session) continue; // nothing started yet
    for (const def of timed) {
      if (session.skippedPhases?.includes(getTaskCategory(def))) continue;
      const task = session.tasks.find((t) => t.definitionId === def.id);
      const timer = task && timerState(def, task, now);
      if (!timer) continue;
      const base = { childId: profile.id, definitionId: def.id, dueTime: hhmm(timer.endsAt), dueAt: timer.endsAt, childIndex };
      const prefix = `${date}_${profile.id}_${def.id}_t${timer.startedAt}`;
      if (timer.expired) {
        result.push({ ...base, key: `${prefix}_up`, kind: 'timeup' });
        continue;
      }
      const passed = warningsFor({ timerWarnings }, def.durationMinutes!).filter((m) => timer.remainingMs <= m * 60_000);
      if (passed.length === 0) continue;
      const closest = passed[passed.length - 1];
      result.push({ ...base, key: `${prefix}_w${closest}`, kind: 'warning', minutesLeft: Math.min(closest, minutesLeft(timer.remainingMs)) });
    }
  }

  return result.sort(byTimeThenChild).map(withoutIndex);
}

/** Everything to announce now: late tasks, tasks to start and timed tasks, by time then child. */
export function findReminderTasks(
  now: number,
  date: string,
  profiles: ChildProfile[],
  sessions: RoutineSession[],
  definitions: TaskDefinition[],
  context: ReminderContext = {}
): OverdueTask[] {
  const order = new Map(profiles.map((p, i) => [p.id, i]));
  return [
    ...findOverdueTasks(now, date, profiles, sessions, definitions, context),
    ...findStartingTasks(now, date, profiles, sessions, definitions, context),
    ...findTimerTasks(now, date, profiles, sessions, definitions, context),
  ].sort((a, b) => a.dueAt - b.dueAt || (order.get(a.childId) ?? 0) - (order.get(b.childId) ?? 0));
}

/**
 * Decides which overdue tasks must be announced now, grouped by child (one
 * announcement per child, children in order of their earliest overdue task),
 * and returns the updated log. A task is announced the first time it is overdue,
 * then every `repeatMinutes`, at most `maxReminders` times per day.
 * "Time to start" and "minutes left" reminders are announced only once.
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
    const max = task.kind === 'start' || task.kind === 'warning' ? 1 : settings.maxReminders;
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
