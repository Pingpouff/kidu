import type { CustomStrategy, EmotionLevel, EmotionLog } from '../../../domain/models';
import { DEFAULT_SUGGESTIONS, strategiesForLevel, strategyById } from './catalog';

/** A strategy offered to the child: built-in (label from the dictionary) or added by the parent. */
export type SuggestedStrategy =
  | { kind: 'builtin'; id: string; icon: string }
  | { kind: 'custom'; id: string; icon: string; label: string };

/**
 * Strategies to offer, best first: those the child marked as helpful (most
 * recent first), then the parent's own ones, then the defaults of the age
 * level, then the rest of the level. Built-in strategies above the child's
 * level are never offered; `exclude` removes ids (e.g. "hug" when the screen
 * already says "go and see a grown-up").
 */
export function suggestStrategies(
  level: EmotionLevel,
  helpful: string[] = [],
  custom: CustomStrategy[] = [],
  { count = 2, exclude = [] }: { count?: number; exclude?: string[] } = {}
): SuggestedStrategy[] {
  const allowed = new Set(strategiesForLevel(level).map((s) => s.id));
  const customById = new Map(custom.map((c) => [c.id, c]));
  const order = [
    ...helpful,
    ...custom.map((c) => c.id),
    ...DEFAULT_SUGGESTIONS[level],
    ...strategiesForLevel(level).map((s) => s.id),
  ];

  const result: SuggestedStrategy[] = [];
  const seen = new Set<string>(exclude);
  for (const id of order) {
    if (result.length >= count) break;
    if (seen.has(id)) continue;
    seen.add(id);
    const own = customById.get(id);
    if (own) {
      result.push({ kind: 'custom', id: own.id, icon: own.icon, label: own.label });
    } else if (allowed.has(id)) {
      result.push({ kind: 'builtin', id, icon: strategyById(id)!.icon });
    }
  }
  return result;
}

/** Marks a strategy as helpful (moved to the front) or not anymore. */
export function toggleHelpful(helpful: string[], strategyId: string): string[] {
  return helpful.includes(strategyId)
    ? helpful.filter((id) => id !== strategyId)
    : [strategyId, ...helpful];
}

/** Local date of an epoch, YYYY-MM-DD. */
export function localDate(at: number): string {
  const d = new Date(at);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

let counter = 0;
function newId(at: number): string {
  counter = (counter + 1) % 1_000_000;
  return `emo_${at.toString(36)}_${counter.toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * A "Météo intérieure" check-in, saved as soon as the child picks an emotion
 * (leaving halfway keeps what they said); later steps update it.
 */
export function makeCheckIn(at: number, childId: string, emotionId: string): EmotionLog {
  return { id: newId(at), at, date: localDate(at), kind: 'checkin', childId, emotionId };
}

/** A finished (or interrupted) calm corner session. */
export function makeCalmLog(
  at: number,
  { childId, breaths, nextAction }: { childId?: string; breaths: number; nextAction?: string }
): EmotionLog {
  return {
    id: newId(at),
    at,
    date: localDate(at),
    kind: 'calm',
    breaths,
    ...(childId ? { childId } : {}),
    ...(nextAction ? { nextAction } : {}),
  };
}
