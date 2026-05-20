import { ChildProfile, TaskDefinition, RoutineSession, RoutineTask, TaskStatus, HistoryEntry } from './models';

/**
 * Initializes a new routine session for a child with active task definitions.
 */
export function initSession(
  childId: string,
  date: string,
  definitions: TaskDefinition[]
): RoutineSession {
  const sortedDefs = [...definitions].sort((a, b) => a.order - b.order);
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
  // Sort definitions by order
  const sortedDefs = [...definitions].sort((a, b) => a.order - b.order);

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

