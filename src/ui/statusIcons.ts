/**
 * Icons that stand for a task's state and times, for children who can't read
 * yet. One table, used by the board columns, task cards, reminders and the
 * selection screen, so a child learns each picture once.
 * They must not clash with the phase icons (`CATEGORY_ICONS`: ☀️ 🎒 🍽️ 🌙).
 */
export const STATUS_ICONS = {
  /** To do / next: "this one is next" */
  todo: '👉',
  /** In progress: "I'm doing it" */
  doing: '🏃',
  /** Done */
  done: '✅',
} as const;

export const TIME_ICONS = {
  /** Expected start time */
  start: '🚀',
  /** Expected end time; red and wiggling once late */
  due: '⏰',
  /** Time allowed / left on a timed task */
  timer: '⏳',
  /** Time allowed is over */
  timeUp: '⌛',
} as const;

/** Colors of each state, the same as the board columns (yellow, amber, emerald). */
export const STATUS_TONES = {
  todo: 'bg-yellow-500/20 border-yellow-500/40',
  doing: 'bg-amber-500/25 border-amber-500/40',
  done: 'bg-emerald-500/20 border-emerald-500/40',
} as const;
