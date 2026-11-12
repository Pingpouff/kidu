import { dayContext, isTaskForSchedule } from './calendar';
import {
  CalendarPeriod,
  ChildProfile,
  TaskDefinition,
  RoutineSession,
  RoutineTask,
  TaskStatus,
  HistoryEntry,
  TaskCategory,
  TASK_CATEGORIES,
} from './models';

/**
 * Category of a task definition. Tasks created before categories existed
 * (or whose definition was removed) belong to the bedtime phase.
 */
export function getTaskCategory(definition: TaskDefinition | undefined): TaskCategory {
  return definition?.category ?? 'bedtime';
}

/**
 * True when the task is part of this child's routine: common tasks (no
 * assignment) belong to every child, assigned ones only to the listed children.
 */
export function isTaskForChild(definition: TaskDefinition, childId: string): boolean {
  return !definition.assignedTo?.length || definition.assignedTo.includes(childId);
}

/** The task definitions of one child's routine. */
export function definitionsForChild(definitions: TaskDefinition[], childId: string): TaskDefinition[] {
  return definitions.filter((d) => isTaskForChild(d, childId));
}

/** Day of the week of a "YYYY-MM-DD" date, local time (0 = Sunday … 6 = Saturday). */
export function weekdayOf(date: string): number {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y, m - 1, d).getDay();
}

/** True when the task is planned on that date (no `days` = every day). */
export function isTaskForDay(definition: TaskDefinition, date: string): boolean {
  return !definition.days?.length || definition.days.includes(weekdayOf(date));
}

/** True when the task is planned for that child on that date: weekday, and school / holidays. */
export function isTaskForChildOn(definition: TaskDefinition, childId: string, date: string, periods?: CalendarPeriod[]): boolean {
  return (
    isTaskForChild(definition, childId) &&
    isTaskForDay(definition, date) &&
    isTaskForSchedule(definition, dayContext(periods, date, childId).holidays)
  );
}

/** The task definitions of one child's routine on a given date (holidays and rest days from `periods`). */
export function definitionsForChildOn(definitions: TaskDefinition[], childId: string, date: string, periods?: CalendarPeriod[]): TaskDefinition[] {
  return definitions.filter((d) => isTaskForChildOn(d, childId, date, periods));
}

/**
 * Removes a deleted child from task assignments. Tasks that were assigned only
 * to that child are returned in `orphans` (they belong to nobody anymore).
 */
export function unassignChild(
  definitions: TaskDefinition[],
  childId: string
): { updated: TaskDefinition[]; orphans: string[] } {
  const updated: TaskDefinition[] = [];
  const orphans: string[] = [];
  for (const def of definitions) {
    if (!def.assignedTo?.includes(childId)) continue;
    const rest = def.assignedTo.filter((id) => id !== childId);
    if (rest.length === 0) orphans.push(def.id);
    else updated.push({ ...def, assignedTo: rest });
  }
  return { updated, orphans };
}

/**
 * Sorts task definitions by routine phase, then by their order inside the phase.
 */
export function sortDefinitions(definitions: TaskDefinition[]): TaskDefinition[] {
  return [...definitions].sort((a, b) => {
    const byCategory =
      TASK_CATEGORIES.indexOf(getTaskCategory(a)) - TASK_CATEGORIES.indexOf(getTaskCategory(b));
    return byCategory !== 0 ? byCategory : a.order - b.order;
  });
}

export interface RoutinePhase {
  category: TaskCategory;
  tasks: RoutineTask[];
  isCompleted: boolean;
  /** Skipped by a parent today: the board moves on, its tasks aren't late */
  isSkipped: boolean;
}

/**
 * Splits a session into its phases (only categories that contain tasks),
 * in routine order.
 */
export function getRoutinePhases(
  session: RoutineSession,
  definitions: TaskDefinition[]
): RoutinePhase[] {
  const categoryOf = (task: RoutineTask) =>
    getTaskCategory(definitions.find((d) => d.id === task.definitionId));

  return TASK_CATEGORIES
    .map((category) => {
      const tasks = session.tasks.filter((t) => categoryOf(t) === category);
      return {
        category,
        tasks,
        isCompleted: tasks.every((t) => t.status === 'done'),
        isSkipped: session.skippedPhases?.includes(category) ?? false,
      };
    })
    .filter((phase) => phase.tasks.length > 0);
}

/**
 * Index of the phase the child is working on: the first one neither completed nor skipped.
 * When everything is done, stays on the last phase. Returns -1 when there are no tasks.
 */
export function getCurrentPhaseIndex(phases: RoutinePhase[]): number {
  if (phases.length === 0) return -1;
  const index = phases.findIndex((p) => !p.isCompleted && !p.isSkipped);
  return index === -1 ? phases.length - 1 : index;
}

/**
 * The day's routine is completed when every step is done or skipped,
 * with at least one step actually done.
 */
export function isSessionCompleted(session: RoutineSession, definitions: TaskDefinition[]): boolean {
  const phases = getRoutinePhases(session, definitions);
  return (
    phases.length > 0 &&
    phases.every((p) => p.isCompleted || p.isSkipped) &&
    phases.some((p) => p.isCompleted && !p.isSkipped)
  );
}

/** Recomputes `isCompleted` / `completedAt` after tasks or skipped steps changed. */
export function withCompletion(session: RoutineSession, definitions: TaskDefinition[], now = Date.now()): RoutineSession {
  const isCompleted = isSessionCompleted(session, definitions);
  return { ...session, isCompleted, completedAt: isCompleted ? (session.completedAt ?? now) : undefined };
}

/** A parent skips a step for today: the board moves to the next one. */
export function skipPhase(session: RoutineSession, category: TaskCategory, definitions: TaskDefinition[]): RoutineSession {
  const skipped = new Set(session.skippedPhases ?? []);
  skipped.add(category);
  return withCompletion({ ...session, skippedPhases: [...skipped] }, definitions);
}

/** Brings a skipped step back. */
export function unskipPhase(session: RoutineSession, category: TaskCategory, definitions: TaskDefinition[]): RoutineSession {
  const skippedPhases = (session.skippedPhases ?? []).filter((c) => c !== category);
  return withCompletion({ ...session, skippedPhases }, definitions);
}

/**
 * Initializes a new routine session for a child with active task definitions.
 */
export function initSession(
  childId: string,
  date: string,
  definitions: TaskDefinition[],
  periods?: CalendarPeriod[]
): RoutineSession {
  const sortedDefs = sortDefinitions(definitionsForChildOn(definitions, childId, date, periods));
  const tasks: RoutineTask[] = sortedDefs.map((def) => ({
    id: `${childId}_${def.id}_${date}`,
    definitionId: def.id,
    status: 'todo',
  }));

  return {
    id: `${date}_${childId}`,
    childId,
    date,
    tasks,
    isCompleted: false,
  };
}

/**
 * Moves a task to a target status inside a session.
 * Updates session completion fields.
 */
export function moveTask(
  session: RoutineSession,
  taskId: string,
  toStatus: TaskStatus,
  definitions: TaskDefinition[],
  now = Date.now()
): RoutineSession {
  const updatedTasks = session.tasks.map((task) => {
    if (task.id !== taskId) return task;
    // A timed task counts from the moment it is started; done keeps that moment
    const startedAt =
      toStatus === 'doing' ? (task.status === 'doing' ? task.startedAt ?? now : now) : toStatus === 'done' ? task.startedAt : undefined;
    return { ...task, status: toStatus, completedAt: toStatus === 'done' ? now : undefined, startedAt };
  });
  return withCompletion({ ...session, tasks: updatedTasks }, definitions, now);
}

/**
 * Resets all tasks in a session back to 'todo' status.
 */
export function resetSession(session: RoutineSession): RoutineSession {
  const updatedTasks = session.tasks.map((task) => ({
    ...task,
    status: 'todo' as TaskStatus,
    completedAt: undefined,
    startedAt: undefined,
  }));

  return {
    ...session,
    tasks: updatedTasks,
    isCompleted: false,
    completedAt: undefined,
    skippedPhases: [],
  };
}

/**
 * Converts a routine session into a history record.
 */
export function calculateHistory(
  session: RoutineSession,
  childName: string
): HistoryEntry {
  const totalTasks = session.tasks.length;
  const completedTasks = session.tasks.filter((t) => t.status === 'done').length;

  return {
    id: session.id,
    date: session.date,
    childId: session.childId,
    childName,
    totalTasks,
    completedTasks,
    isCompleted: session.isCompleted,
    completedAt: session.completedAt,
  };
}

/**
 * Awards stars to a child profile when a routine is completed.
 */
export function awardStars(
  profile: ChildProfile,
  stars: number
): ChildProfile {
  return {
    ...profile,
    stars: profile.stars + stars,
  };
}

/**
 * Synchronizes an existing session's tasks with a new list of definitions.
 * Preserves task status and completedAt for tasks that are still present.
 * Reorders tasks based on the definition's order.
 * Removes tasks that are no longer present.
 * Adds new tasks with 'todo' status.
 */
export function syncSessionWithDefinitions(
  session: RoutineSession,
  definitions: TaskDefinition[],
  periods?: CalendarPeriod[]
): RoutineSession {
  // This child's tasks that day, sorted by phase, then order
  const sortedDefs = sortDefinitions(definitionsForChildOn(definitions, session.childId, session.date, periods));

  // Build the new tasks list
  const newTasks: RoutineTask[] = sortedDefs.map((def) => {
    // Find if this task was already in the session
    const existing = session.tasks.find((t) => t.definitionId === def.id);

    if (existing) {
      // Keep its status and completedAt
      return {
        id: existing.id,
        definitionId: def.id,
        status: existing.status,
        completedAt: existing.completedAt,
        ...(existing.startedAt !== undefined ? { startedAt: existing.startedAt } : {}),
        ...(existing.rewarded ? { rewarded: true } : {}),
      };
    } else {
      // Create new routine task
      return {
        id: `${session.childId}_${def.id}_${session.date}`,
        definitionId: def.id,
        status: 'todo',
      };
    }
  });

  // Completion with the new task list (skipped steps are kept)
  return withCompletion({ ...session, tasks: newTasks }, definitions);
}

