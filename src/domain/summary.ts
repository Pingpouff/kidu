import { ChildProfile, ParentSettings, RoutineSession, TaskCategory, TaskDefinition } from './models';
import { getCurrentPhaseIndex, getRoutinePhases, initSession, isSessionCompleted, isTaskForChild, sortDefinitions } from './routine';
import { dueTimeToEpoch, findOverdueTasks, isMuted, isValidDueTime } from './reminders';
import { starsPerMedal, unspentBadges } from './rewards';
import { NeutralDay, currentStreak, onlyNeutralBetween } from './trophies';
import { tonightCardState, TonightCardState } from './cards';
import { dayContext } from './calendar';
import { CalendarPeriod } from './models';

/**
 * Overview shown on the child selection screen: where each child is in
 * tonight's routine, what is late, what comes next, and their rewards.
 */

export type RoutineStatus = 'no_tasks' | 'not_started' | 'in_progress' | 'completed';

export interface ChildSummary {
  childId: string;
  status: RoutineStatus;
  done: number;
  total: number;
  /** Phase the child is on (the first one not completed) */
  phase?: { category: TaskCategory; done: number; total: number; index: number; count: number };
  /** Tasks in the "doing" column */
  doing: string[];
  /** Next task to do (first "todo" in routine order) */
  next?: string;
  /** Late tasks (past due time, not done) */
  late: string[];
  /** Next expected start or end time still ahead */
  upcoming?: UpcomingEvent;
  completedAt?: number;
  starsToMedal: number;
  pendingBadgeChoices: number;
  piggyBadges: number;
  /** Evenings in a row with a completed routine, still alive (last one today or yesterday) */
  streak: number;
  /** Green / yellow / red cards given tonight */
  cards: TonightCardState;
  /** Today is a holiday or a rest day for this child */
  period?: 'holidays' | 'off';
  /** A parent stopped this child's reminders for tonight */
  muted?: boolean;
}

/**
 * Next moment of a task that is still ahead: its start (task not started yet)
 * or its end (task not done yet).
 */
export interface UpcomingEvent {
  definitionId: string;
  kind: 'start' | 'due';
  at: number; // epoch of that moment
  time: string; // "HH:MM" of that moment
  startTime?: string;
  dueTime?: string;
}

export interface UpcomingDeadline extends UpcomingEvent {
  childIds: string[];
}

/** Next event of a task for a child, given its current status. */
function nextEvent(def: TaskDefinition, status: string, date: string, now: number): UpcomingEvent | undefined {
  if (status === 'done') return undefined;
  const window = {
    ...(isValidDueTime(def.startTime) ? { startTime: def.startTime } : {}),
    ...(isValidDueTime(def.dueTime) ? { dueTime: def.dueTime } : {}),
  };
  if (window.startTime && status === 'todo') {
    const at = dueTimeToEpoch(date, window.startTime);
    if (at > now) return { definitionId: def.id, kind: 'start', at, time: window.startTime, ...window };
  }
  if (window.dueTime) {
    const at = dueTimeToEpoch(date, window.dueTime);
    if (at > now) return { definitionId: def.id, kind: 'due', at, time: window.dueTime, ...window };
  }
  return undefined;
}

/** Today's session of a child, or the one they would get if they started now. */
function sessionOrPreview(childId: string, date: string, sessions: RoutineSession[], definitions: TaskDefinition[], periods?: CalendarPeriod[]) {
  const session = sessions.find((s) => s.childId === childId && s.date === date);
  return { session: session ?? initSession(childId, date, definitions, periods), started: session !== undefined };
}

/**
 * Streak that is still alive: the last completed routine is today's or
 * yesterday's (rest days in between don't count).
 */
export function liveStreak(completedDates: string[], today: string, isNeutral?: NeutralDay): number {
  if (completedDates.length === 0) return 0;
  const last = [...completedDates].sort()[completedDates.length - 1];
  return last <= today && onlyNeutralBetween(last, today, isNeutral) ? currentStreak(completedDates, isNeutral) : 0;
}

export function childSummary(
  now: number,
  date: string,
  profile: ChildProfile,
  sessions: RoutineSession[],
  definitions: TaskDefinition[],
  settings?: ParentSettings
): ChildSummary {
  const periods = settings?.periods;
  const { session, started } = sessionOrPreview(profile.id, date, sessions, definitions, periods);
  const tasks = session.tasks.filter((t) => definitions.some((d) => d.id === t.definitionId));
  const done = tasks.filter((t) => t.status === 'done').length;
  const total = tasks.length;

  const phases = getRoutinePhases({ ...session, tasks }, definitions);
  const phaseIndex = getCurrentPhaseIndex(phases);
  const currentPhase = phases[phaseIndex];

  const status: RoutineStatus =
    total === 0
      ? 'no_tasks'
      : session.isCompleted || isSessionCompleted({ ...session, tasks }, definitions)
        ? 'completed'
        : started && (tasks.some((t) => t.status !== 'todo') || (session.skippedPhases?.length ?? 0) > 0)
          ? 'in_progress'
          : 'not_started';

  const late = findOverdueTasks(now, date, [profile], started ? [session] : [], definitions, { periods, muted: settings?.mutedReminders }).map((t) => t.definitionId);
  const today = dayContext(periods, date, profile.id);

  const statusOf = new Map(tasks.map((t) => [t.definitionId, t.status]));
  const upcoming = sortDefinitions(definitions)
    .filter((d) => statusOf.has(d.id))
    .map((d) => nextEvent(d, statusOf.get(d.id)!, date, now))
    .filter((e): e is UpcomingEvent => e !== undefined)
    .sort((a, b) => a.at - b.at)[0];

  const perMedal = starsPerMedal(settings);
  const completedDates = sessions.filter((s) => s.childId === profile.id && s.isCompleted).map((s) => s.date);

  return {
    childId: profile.id,
    status,
    done,
    total,
    ...(currentPhase
      ? {
          phase: {
            category: currentPhase.category,
            done: currentPhase.tasks.filter((t) => t.status === 'done').length,
            total: currentPhase.tasks.length,
            index: phaseIndex,
            count: phases.length,
          },
        }
      : {}),
    doing: tasks.filter((t) => t.status === 'doing').map((t) => t.definitionId),
    // Next task of the current step (a skipped step's tasks aren't proposed)
    next: (currentPhase?.tasks ?? tasks).find((t) => t.status === 'todo')?.definitionId,
    late,
    ...(upcoming ? { upcoming } : {}),
    ...(session.completedAt ? { completedAt: session.completedAt } : {}),
    starsToMedal: perMedal - ((profile.starProgress ?? 0) % perMedal),
    pendingBadgeChoices: profile.badgeOffers?.length ?? 0,
    piggyBadges: unspentBadges(profile).length,
    streak: liveStreak(completedDates, date, (d) => dayContext(periods, d, profile.id).off),
    cards: tonightCardState(profile, date),
    ...(isMuted(settings?.mutedReminders, date, profile.id) ? { muted: true } : {}),
    ...(today.off ? { period: 'off' as const } : today.holidays ? { period: 'holidays' as const } : {}),
  };
}

/**
 * Next start / end times of the evening, across all children, grouped by task
 * and moment (children listed together).
 */
export function upcomingDeadlines(
  now: number,
  date: string,
  profiles: ChildProfile[],
  sessions: RoutineSession[],
  definitions: TaskDefinition[],
  limit = 3,
  periods?: CalendarPeriod[]
): UpcomingDeadline[] {
  const groups = new Map<string, UpcomingDeadline>();
  for (const def of sortDefinitions(definitions)) {
    if (!isValidDueTime(def.dueTime) && !isValidDueTime(def.startTime)) continue;
    for (const profile of profiles) {
      if (!isTaskForChild(def, profile.id)) continue;
      if (dayContext(periods, date, profile.id).off) continue; // rest day: nothing expected
      const { session } = sessionOrPreview(profile.id, date, sessions, definitions, periods);
      const task = session.tasks.find((t) => t.definitionId === def.id);
      if (!task) continue;
      const event = nextEvent(def, task.status, date, now);
      if (!event) continue;
      const key = `${event.kind}_${def.id}`;
      const group = groups.get(key) ?? { ...event, childIds: [] };
      group.childIds.push(profile.id);
      groups.set(key, group);
    }
  }
  return [...groups.values()].sort((a, b) => a.at - b.at).slice(0, limit);
}

/** Home screen greeting for the hour of the day (0–23). */
export function greetingKey(hour: number): 'home.greeting.morning' | 'home.greeting.afternoon' | 'home.greeting.evening' {
  if (hour >= 5 && hour < 12) return 'home.greeting.morning';
  if (hour >= 12 && hour < 18) return 'home.greeting.afternoon';
  return 'home.greeting.evening';
}
