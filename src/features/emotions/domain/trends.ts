import type { EmotionLog } from '../../../domain/models';
import { emotionById, EmotionFamily } from './catalog';
import { localDate } from './checkin';

/**
 * Gentle trends for the parent: what was felt, when, and how often the calm
 * corner helped. No score, no "good" or "bad" day — just colors to talk about.
 */

export interface DayFeelings {
  date: string; // YYYY-MM-DD
  feelings: { emotionId: string; family: EmotionFamily; color: string; intensity?: 1 | 2 | 3 }[];
  calm: number; // calm corner sessions that day
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Monday of the week of `date` (local), as YYYY-MM-DD. */
function mondayOf(date: string): Date {
  const [y, m, d] = date.split('-').map(Number);
  const day = new Date(y, m - 1, d, 12); // noon: safe across DST changes
  const offset = (day.getDay() + 6) % 7; // 0 = Monday
  return new Date(day.getTime() - offset * DAY_MS);
}

/**
 * The last `weeks` weeks, Monday to Sunday, oldest first (today's week last),
 * with the check-ins and calm corner sessions of each day.
 */
export function weekGrid(logs: EmotionLog[], today: string, weeks = 4): DayFeelings[][] {
  const byDate = new Map<string, EmotionLog[]>();
  for (const log of logs) byDate.set(log.date, [...(byDate.get(log.date) ?? []), log]);

  const firstMonday = mondayOf(today).getTime() - (weeks - 1) * 7 * DAY_MS;
  return Array.from({ length: weeks }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => {
      const date = localDate(firstMonday + (w * 7 + d) * DAY_MS);
      const dayLogs = (byDate.get(date) ?? []).sort((a, b) => a.at - b.at);
      return {
        date,
        feelings: dayLogs.flatMap((l) => {
          const emotion = l.kind === 'checkin' ? emotionById(l.emotionId) : undefined;
          return emotion
            ? [{ emotionId: emotion.id, family: emotion.family, color: emotion.color, ...(l.intensity ? { intensity: l.intensity } : {}) }]
            : [];
        }),
        calm: dayLogs.filter((l) => l.kind === 'calm').length,
      };
    })
  );
}

export type DayMoment = 'morning' | 'afternoon' | 'evening';

/** Moment of the day of an epoch: before noon, before 6 pm, then evening. */
export function momentOf(at: number): DayMoment {
  const hour = new Date(at).getHours();
  return hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
}

/** When unpleasant feelings were named (check-ins since `fromDate`), by moment of the day. */
export function hardMoments(logs: EmotionLog[], fromDate: string): Record<DayMoment, number> {
  const counts: Record<DayMoment, number> = { morning: 0, afternoon: 0, evening: 0 };
  for (const log of logs) {
    if (log.kind !== 'checkin' || log.date < fromDate) continue;
    const emotion = emotionById(log.emotionId);
    if (emotion && !emotion.pleasant) counts[momentOf(log.at)] += 1;
  }
  return counts;
}

/** Calm corner sessions since `fromDate`. */
export function calmCount(logs: EmotionLog[], fromDate: string): number {
  return logs.filter((l) => l.kind === 'calm' && l.date >= fromDate).length;
}

/** Most named families since `fromDate`, most frequent first (ties: catalog order). */
export function familyCounts(logs: EmotionLog[], fromDate: string): { family: EmotionFamily; count: number }[] {
  const counts = new Map<EmotionFamily, number>();
  for (const log of logs) {
    if (log.kind !== 'checkin' || log.date < fromDate) continue;
    const emotion = emotionById(log.emotionId);
    if (emotion) counts.set(emotion.family, (counts.get(emotion.family) ?? 0) + 1);
  }
  return [...counts.entries()].map(([family, count]) => ({ family, count })).sort((a, b) => b.count - a.count);
}
