import {
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
      };
    })
    .filter((phase) => phase.tasks.length > 0);
}

/**
 * Index of the phase the child is working on: the first one not completed.
 * When everything is done, stays on the last phase. Returns -1 when there are no tasks.
 */
export function getCurrentPhaseIndex(phases: RoutinePhase[]): number {
  if (phases.length === 0) return -1;
  const index = phases.findIndex((p) => !p.isCompleted);
  return index === -1 ? phases.length - 1 : index;
}

/**
 * Initializes a new routine session for a child with active task definitions.
 */
export function initSession(
  childId: string,
  date: string,
  definitions: TaskDefinition[]
): RoutineSession {
  const sortedDefs = sortDefinitions(definitions);
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
  toStatus: TaskStatus
): RoutineSession {
  const updatedTasks = session.tasks.map((task) => {
    if (task.id === taskId) {
      return {
        ...task,
        status: toStatus,
        completedAt: toStatus === 'done' ? Date.now() : undefined,
      };
    }
    return task;
  });

  const isCompleted = updatedTasks.every((task) => task.status === 'done');
  const completedAt = isCompleted
    ? (session.completedAt || Date.now())
    : undefined;

  return {
    ...session,
    tasks: updatedTasks,
    isCompleted,
    completedAt,
  };
}

/**
 * Resets all tasks in a session back to 'todo' status.
 */
export function resetSession(session: RoutineSession): RoutineSession {
  const updatedTasks = session.tasks.map((task) => ({
    ...task,
    status: 'todo' as TaskStatus,
    completedAt: undefined,
  }));

  return {
    ...session,
    tasks: updatedTasks,
    isCompleted: false,
    completedAt: undefined,
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
  definitions: TaskDefinition[]
): RoutineSession {
  // Sort definitions by phase, then order
  const sortedDefs = sortDefinitions(definitions);

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

  // Calculate completion status of synchronized session
  const isCompleted = newTasks.length > 0 && newTasks.every((t) => t.status === 'done');
  const completedAt = isCompleted ? (session.completedAt || Date.now()) : undefined;

  return {
    ...session,
    tasks: newTasks,
    isCompleted,
    completedAt,
  };
}

