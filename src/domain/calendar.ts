import { CalendarPeriod, TaskDefinition } from './models';

/**
 * Holidays and rest days set by a parent (pure rules).
 * - `holidays`: no school; tasks marked "school" disappear, tasks marked
 *   "holidays" appear.
 * - `off` (rest day: sick, outing…): no school either, no reminders, and the
 *   day neither counts nor breaks a streak. The child can still tick tasks.
 */

export interface DayContext {
  /** No school that day (holidays or rest day) */
  holidays: boolean;
  /** Rest day: no reminders, streak kept */
  off: boolean;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
export const isValidDate = (value: unknown): value is string => typeof value === 'string' && DATE_RE.test(value);

/** True when the period covers that date (both ends included) for that child. */
export function periodApplies(period: CalendarPeriod, date: string, childId: string): boolean {
  if (date < period.from || date > period.to) return false;
  return !period.childIds?.length || period.childIds.includes(childId);
}

export function dayContext(periods: CalendarPeriod[] | undefined, date: string, childId: string): DayContext {
  const active = (periods ?? []).filter((p) => periodApplies(p, date, childId));
  const off = active.some((p) => p.kind === 'off');
  return { off, holidays: off || active.some((p) => p.kind === 'holidays') };
}

/** True when the task belongs to that kind of day ("school" tasks only on school days…). */
export function isTaskForSchedule(definition: TaskDefinition, holidays: boolean): boolean {
  if (!definition.schedule) return true;
  return definition.schedule === 'holidays' ? holidays : !holidays;
}

/** A rest day for that child: no reminders, the streak goes over it. */
export const isDayOff = (periods: CalendarPeriod[] | undefined, date: string, childId: string) =>
  dayContext(periods, date, childId).off;

/** Periods still useful (ending today or later), soonest first. */
export function upcomingPeriods(periods: CalendarPeriod[] | undefined, today: string): CalendarPeriod[] {
  return (periods ?? []).filter((p) => p.to >= today).sort((a, b) => a.from.localeCompare(b.from) || a.to.localeCompare(b.to));
}

/** Drops periods that ended more than `keepDays` days ago (they would pile up). */
export function prunePeriods(periods: CalendarPeriod[], today: string, keepDays = 60): CalendarPeriod[] {
  const [y, m, d] = today.split('-').map(Number);
  const limit = new Date(y, m - 1, d - keepDays);
  const cutoff = `${limit.getFullYear()}-${String(limit.getMonth() + 1).padStart(2, '0')}-${String(limit.getDate()).padStart(2, '0')}`;
  return periods.filter((p) => p.to >= cutoff);
}

/** A valid period: dates in order, known kind. */
export function isValidPeriod(period: Pick<CalendarPeriod, 'kind' | 'from' | 'to'>): boolean {
  return (period.kind === 'holidays' || period.kind === 'off') && isValidDate(period.from) && isValidDate(period.to) && period.from <= period.to;
}
