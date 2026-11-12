import { DEFAULT_TIMER_WARNINGS, ReminderSettings, RoutineTask, TaskDefinition } from './models';

/**
 * Timed tasks ("the meal must be finished in 30 minutes"): the time allowed
 * (`TaskDefinition.durationMinutes`) starts when the child moves the task to
 * "doing" (`RoutineTask.startedAt`). Pure rules.
 */

export const MAX_DURATION_MINUTES = 180;

export const isValidDuration = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= MAX_DURATION_MINUTES;

/** Parses a duration field: a whole number of minutes, or undefined when empty / invalid. */
export const parseDuration = (value: string): number | undefined => {
  const n = Number(value);
  return value !== '' && isValidDuration(n) ? n : undefined;
};

export interface TimerState {
  startedAt: number;
  endsAt: number;
  durationMs: number;
  remainingMs: number; // 0 once the time is up
  /** Share of the time still left, 1 → 0 */
  fraction: number;
  expired: boolean;
}

/** Countdown of a task in progress, or undefined when it isn't timed or not started. */
export function timerState(definition: TaskDefinition | undefined, task: RoutineTask, now: number): TimerState | undefined {
  if (!definition || !isValidDuration(definition.durationMinutes)) return undefined;
  if (task.status !== 'doing' || task.startedAt === undefined) return undefined;
  const durationMs = definition.durationMinutes * 60_000;
  const endsAt = task.startedAt + durationMs;
  const remainingMs = Math.max(0, endsAt - now);
  return {
    startedAt: task.startedAt,
    endsAt,
    durationMs,
    remainingMs,
    fraction: remainingMs / durationMs,
    expired: remainingMs === 0,
  };
}

/** Minutes left shown to the child: rounded up, so "1 min" until the very end. */
export const minutesLeft = (remainingMs: number) => Math.ceil(remainingMs / 60_000);

/**
 * "Minutes left" warnings that make sense for a task of this duration, largest
 * first (a warning at 10 min is useless for a 10-minute task).
 */
export function warningsFor(settings: Pick<ReminderSettings, 'timerWarnings'> | undefined, durationMinutes: number): number[] {
  const warnings = settings?.timerWarnings ?? DEFAULT_TIMER_WARNINGS;
  return [...new Set(warnings)].filter((m) => Number.isInteger(m) && m > 0 && m < durationMinutes).sort((a, b) => b - a);
}
