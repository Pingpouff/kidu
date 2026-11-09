import { ChildProfile } from '../domain/models';

export type ChildColor = ChildProfile['color'];

export const CHILD_COLORS: ChildColor[] = ['indigo', 'purple', 'rose', 'emerald', 'amber'];

/**
 * Every class tied to a child's color, in one place. Adding a color means
 * adding one entry here (and its `.theme-*` background in index.css).
 */
export interface ChildTheme {
  /** Board background (index.css) */
  board: string;
  /** Selection screen card */
  card: string;
  /** Plain progress bar fill */
  bar: string;
  /** Board progress bar gradient */
  progress: string;
  /** Final celebration background gradient */
  celebration: string;
  /** Parent Mode profile row */
  managerRow: string;
}

export const CHILD_THEMES: Record<ChildColor, ChildTheme> = {
  indigo: {
    board: 'theme-indigo',
    card: 'from-indigo-500/30 to-indigo-900/40 border-indigo-500/40 hover:border-indigo-400 hover:shadow-indigo-500/20',
    bar: 'bg-indigo-400',
    progress: 'from-indigo-500 to-cyan-400 shadow-cyan-500/20',
    celebration: 'from-indigo-950 via-slate-900 to-indigo-950',
    managerRow: 'border-indigo-500/30 hover:bg-indigo-950/10',
  },
  purple: {
    board: 'theme-purple',
    card: 'from-purple-500/30 to-purple-900/40 border-purple-500/40 hover:border-purple-400 hover:shadow-purple-500/20',
    bar: 'bg-purple-400',
    progress: 'from-purple-500 to-pink-400 shadow-pink-500/20',
    celebration: 'from-purple-950 via-slate-900 to-purple-950',
    managerRow: 'border-purple-500/30 hover:bg-purple-950/10',
  },
  rose: {
    board: 'theme-rose',
    card: 'from-rose-500/30 to-rose-900/40 border-rose-500/40 hover:border-rose-400 hover:shadow-rose-500/20',
    bar: 'bg-rose-400',
    progress: 'from-rose-500 to-orange-400 shadow-orange-500/20',
    celebration: 'from-rose-950 via-slate-900 to-rose-950',
    managerRow: 'border-rose-500/30 hover:bg-rose-950/10',
  },
  emerald: {
    board: 'theme-emerald',
    card: 'from-emerald-500/30 to-emerald-900/40 border-emerald-500/40 hover:border-emerald-400 hover:shadow-emerald-500/20',
    bar: 'bg-emerald-400',
    progress: 'from-emerald-500 to-teal-300 shadow-teal-500/20',
    celebration: 'from-emerald-950 via-slate-900 to-emerald-950',
    managerRow: 'border-emerald-500/30 hover:bg-emerald-950/10',
  },
  amber: {
    board: 'theme-amber',
    card: 'from-amber-500/30 to-amber-900/40 border-amber-500/40 hover:border-amber-400 hover:shadow-amber-500/20',
    bar: 'bg-amber-400',
    progress: 'from-amber-500 to-yellow-300 shadow-yellow-500/20',
    celebration: 'from-amber-950 via-slate-900 to-amber-950',
    managerRow: 'border-amber-500/30 hover:bg-amber-950/10',
  },
};

/** Theme of a child color, falling back to indigo for unknown values. */
export const childTheme = (color: ChildColor | string | undefined): ChildTheme =>
  CHILD_THEMES[color as ChildColor] ?? CHILD_THEMES.indigo;
