import type { DisplayStyle } from '../domain/models';

/**
 * Display style (glass / paper): a class on <html> drives the color tokens
 * of index.css. The choice lives in settings.feedback.style; it is also kept
 * in localStorage so the next start shows the right style before the
 * database has loaded (no dark flash on a paper app).
 */
const STORAGE_KEY = 'kidu.style';

/** Status bar color (Android) of screens without a child color, per style */
export const BASE_STATUS_BAR: Record<DisplayStyle, { home: string; parent: string }> = {
  glass: { home: '#1e1b4b', parent: '#0f172a' },
  paper: { home: '#f8f4eb', parent: '#f3ede1' },
};

export function resolveStyle(style: DisplayStyle | undefined): DisplayStyle {
  return style === 'paper' ? 'paper' : 'glass';
}

/** Applies the style to the page and remembers it for the next start. */
export function applyDisplayStyle(style: DisplayStyle | undefined): void {
  const resolved = resolveStyle(style);
  document.documentElement.classList.toggle('paper', resolved === 'paper');
  try {
    localStorage.setItem(STORAGE_KEY, resolved);
  } catch {
    // Best effort: private mode or blocked storage only means a dark first frame
  }
}

/** Applies the style remembered from the last run (called before React mounts). */
export function restoreDisplayStyle(): void {
  try {
    if (localStorage.getItem(STORAGE_KEY) === 'paper') document.documentElement.classList.add('paper');
  } catch {
    // Settings will apply it once loaded
  }
}
