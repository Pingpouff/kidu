import { cx } from './cx';

/* Class builders of the UI kit: use them directly when a component would be overkill. */

/* Form fields (Parent Mode) */

export type FieldSize = 'lg' | 'md' | 'sm';

const FIELD_BASE =
  'bg-slate-900 border text-white placeholder:text-white/40 focus:outline-none focus:border-indigo-500 [color-scheme:dark] paper:[color-scheme:light] disabled:opacity-40';

const FIELD_SIZES: Record<FieldSize, string> = {
  lg: 'min-h-[48px] px-4 py-3 rounded-xl', // main creation forms
  md: 'min-h-[44px] px-4 py-2.5 rounded-xl text-sm', // settings and secondary forms
  sm: 'min-h-[40px] px-2.5 py-1.5 rounded-lg text-sm', // inline editing in a list row
};

/**
 * Classes of a text / number / time input or a select.
 * `editing` gives the indigo border used while a row is being edited.
 */
export function fieldClass(size: FieldSize = 'md', extra?: string, { editing = false } = {}): string {
  return cx(FIELD_BASE, FIELD_SIZES[size], editing ? 'border-indigo-500/30' : 'border-white/10', extra);
}

/* Buttons */

export type ButtonVariant = 'primary' | 'danger' | 'secondary' | 'success';
export type ButtonSize = 'sm' | 'md' | 'lg';

const BUTTON_BASE =
  'tap-target inline-flex items-center justify-center gap-2 font-bold rounded-xl border active:scale-95 transition-all disabled:opacity-40 disabled:pointer-events-none';

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-indigo-600 hover:bg-indigo-500 border-indigo-400/20 text-white',
  danger: 'bg-rose-600 hover:bg-rose-500 border-rose-400/20 text-white',
  success: 'bg-emerald-600 hover:bg-emerald-500 border-emerald-400/20 text-white',
  secondary: 'bg-white/5 hover:bg-white/10 border-white/10 text-white/80 hover:text-white',
};

const BUTTON_SIZES: Record<ButtonSize, string> = {
  sm: 'min-h-[40px] px-4 py-2 text-xs',
  md: 'min-h-[44px] px-5 py-2.5 text-sm',
  lg: 'min-h-[48px] px-6 py-3',
};

export function buttonClass(variant: ButtonVariant = 'primary', size: ButtonSize = 'md', extra?: string): string {
  return cx(BUTTON_BASE, BUTTON_VARIANTS[variant], BUTTON_SIZES[size], extra);
}

/* Square icon buttons used in list rows (edit, delete, save, cancel) */

export type IconButtonTone = 'edit' | 'danger' | 'success' | 'neutral';

const ICON_TONES: Record<IconButtonTone, string> = {
  edit: 'bg-white/5 hover:bg-indigo-600/30 border-white/10 hover:border-indigo-500/30 text-white/50 hover:text-indigo-200',
  danger: 'bg-white/5 hover:bg-rose-600/30 border-white/10 hover:border-rose-500 text-rose-400 hover:text-white',
  success: 'bg-emerald-600/20 hover:bg-emerald-600 border-emerald-500/20 text-emerald-400 hover:text-white',
  neutral: 'bg-white/5 hover:bg-white/15 border-white/10 text-white/60 hover:text-white',
};

export function iconButtonClass(tone: IconButtonTone = 'neutral', extra?: string): string {
  return cx('tap-target inline-flex items-center justify-center gap-1 min-w-[44px] min-h-[44px] p-2.5 border rounded-xl transition-colors text-xs font-bold', ICON_TONES[tone], extra);
}

/* ------------------------------------------------------------------ */
/* Pills / chips                                                        */
/* ------------------------------------------------------------------ */

/** Toggle chip (e.g. "Every child" / one child). */
export function chipClass(active: boolean, compact = false): string {
  return cx(
    'tap-target flex items-center gap-1.5 rounded-full border font-bold transition-colors',
    compact ? 'min-h-[36px] px-3 py-1 text-xs' : 'min-h-[40px] px-3.5 py-1.5 text-sm',
    active ? 'bg-indigo-500/30 border-indigo-400/60 text-white' : 'bg-white/5 border-white/10 text-white/50 hover:text-white'
  );
}
