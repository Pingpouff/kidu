import { ChildProfile, ParentSettings, RoutineSession, TaskCategory, TaskDefinition } from './models';
import { getCurrentPhaseIndex, getRoutinePhases, initSession, isTaskForChild, sortDefinitions } from './routine';
import { dueTimeToEpoch, findOverdueTasks, isValidDueTime } from './reminders';
import { starsPerMedal, unspentBadges } from './rewards';
import { currentStreak, dayDiff } from './trophies';

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
  /** Next task with a due time still ahead */
  upcoming?: { definitionId: string; dueTime: string; dueAt: number };
  completedAt?: number;
  starsToMedal: number;
  pendingBadgeChoices: number;
  piggyBadges: number;
  /** Evenings in a row with a completed routine, still alive (last one today or yesterday) */
  streak: number;
}

export interface UpcomingDeadline {
  dueTime: string;
  dueAt: number;
  definitionId: string;
  childIds: string[];
}

/** Today's session of a child, or the one they would get if they started now. */
function sessionOrPreview(childId: string, date: string, sessions: RoutineSession[], definitions: TaskDefinition[]) {
  const session = sessions.find((s) => s.childId === childId && s.date === date);
  return { session: session ?? initSession(childId, date, definitions), started: session !== undefined };
}

/** Streak that is still alive: the last completed routine is today's or yesterday's. */
export function liveStreak(completedDates: string[], today: string): number {
  if (completedDates.length === 0) return 0;
  const last = [...completedDates].sort()[completedDates.length - 1];
  return dayDiff(last, today) <= 1 ? currentStreak(completedDates) : 0;
}

export function childSummary(
  now: number,
  date: string,
  profile: ChildProfile,
  sessions: RoutineSession[],
  definitions: TaskDefinition[],
  settings?: ParentSettings
): ChildSummary {
  const { session, started } = sessionOrPreview(profile.id, date, sessions, definitions);
  const tasks = session.tasks.filter((t) => definitions.some((d) => d.id === t.definitionId));
  const done = tasks.filter((t) => t.status === 'done').length;
  const total = tasks.length;

  const phases = getRoutinePhases({ ...session, tasks }, definitions);
  const phaseIndex = getCurrentPhaseIndex(phases);
  const currentPhase = phases[phaseIndex];

  const status: RoutineStatus =
    total === 0
      ? 'no_tasks'
      : session.isCompleted || done === total
        ? 'completed'
        : started && tasks.some((t) => t.status !== 'todo')
          ? 'in_progress'
          : 'not_started';

  const late = findOverdueTasks(now, date, [profile], started ? [session] : [], definitions).map((t) => t.definitionId);

  const notDone = new Set(tasks.filter((t) => t.status !== 'done').map((t) => t.definitionId));
  const upcoming = sortDefinitions(definitions)
    .filter((d) => notDone.has(d.id) && isValidDueTime(d.dueTime))
    .map((d) => ({ definitionId: d.id, dueTime: d.dueTime!, dueAt: dueTimeToEpoch(date, d.dueTime!) }))
    .filter((d) => d.dueAt > now)
    .sort((a, b) => a.dueAt - b.dueAt)[0];

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
    next: tasks.find((t) => t.status === 'todo')?.definitionId,
    late,
    ...(upcoming ? { upcoming } : {}),
    ...(session.completedAt ? { completedAt: session.completedAt } : {}),
    starsToMedal: perMedal - ((profile.starProgress ?? 0) % perMedal),
    pendingBadgeChoices: profile.badgeOffers?.length ?? 0,
    piggyBadges: unspentBadges(profile).length,
    streak: liveStreak(completedDates, date),
  };
}

/**
 * Next due times of the evening, across all children: tasks not done yet whose
 * due time is still ahead, grouped by task and time (children listed together).
 */
export function upcomingDeadlines(
  now: number,
  date: string,
  profiles: ChildProfile[],
  sessions: RoutineSession[],
  definitions: TaskDefinition[],
  limit = 3
): UpcomingDeadline[] {
  const groups = new Map<string, UpcomingDeadline>();
  for (const def of sortDefinitions(definitions)) {
    if (!isValidDueTime(def.dueTime)) continue;
    const dueAt = dueTimeToEpoch(date, def.dueTime);
    if (dueAt <= now) continue;
    for (const profile of profiles) {
      if (!isTaskForChild(def, profile.id)) continue;
      const { session } = sessionOrPreview(profile.id, date, sessions, definitions);
      const task = session.tasks.find((t) => t.definitionId === def.id);
      if (!task || task.status === 'done') continue;
      const key = `${def.dueTime}_${def.id}`;
      const group = groups.get(key) ?? { dueTime: def.dueTime, dueAt, definitionId: def.id, childIds: [] };
      group.childIds.push(profile.id);
      groups.set(key, group);
    }
  }
  return [...groups.values()].sort((a, b) => a.dueAt - b.dueAt).slice(0, limit);
}
