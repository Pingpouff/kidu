import { useEffect, useRef } from 'react';

/**
 * Android Back button / gesture (and the browser's back), like a native app:
 * it closes the top window first, then goes up one level (board → home,
 * Parent Mode → home); only on the home screen does it leave the app.
 *
 * While at least one level is open, a single "guard" history entry sits on
 * top. Back pops it: the top level's handler runs, and the guard comes back if
 * levels remain. When the last level closes from the UI (✕, a choice…), the
 * guard is removed with `history.back()` and that popstate is ignored. One
 * entry only, whatever the number of levels, so the count can never drift
 * (React StrictMode mounts effects twice in development).
 */

interface Entry {
  onBack: () => void;
}

const stack: Entry[] = [];
let guard = false; // our entry is the current history entry
let ignoredPops = 0;
let listening = false;
let cleanupScheduled = false;

function ensureGuard() {
  if (guard) return;
  history.pushState({ kiduBack: true }, '');
  guard = true;
}

function onPopState() {
  if (ignoredPops > 0) {
    ignoredPops--;
    return;
  }
  guard = false;
  const top = stack.pop();
  top?.onBack();
  if (stack.length > 0) ensureGuard();
}

function listen() {
  if (listening || typeof window === 'undefined') return;
  window.addEventListener('popstate', onPopState);
  listening = true;
}

/** Once every level is closed, removes the guard (after the current updates settle). */
function scheduleCleanup() {
  if (cleanupScheduled) return;
  cleanupScheduled = true;
  window.setTimeout(() => {
    cleanupScheduled = false;
    if (stack.length === 0 && guard) {
      guard = false;
      ignoredPops++;
      history.back();
    }
  }, 0);
}

/** Registers a level; returns a function to call when it closes from the UI. */
export function pushBack(onBack: () => void): () => void {
  listen();
  const entry: Entry = { onBack };
  stack.push(entry);
  ensureGuard();
  return () => {
    const index = stack.indexOf(entry);
    if (index < 0) return; // already popped by Back
    stack.splice(index, 1);
    if (stack.length === 0) scheduleCleanup();
  };
}

/** Number of open levels (tests). */
export const backStackSize = () => stack.length;

/**
 * While `active`, Back runs `onBack`. With `onBack` null, Back does nothing
 * (a choice the child must make, e.g. a medal motif): the level stays.
 */
export function useBackHandler(active: boolean, onBack: (() => void) | null) {
  const handler = useRef(onBack);
  handler.current = onBack;
  useEffect(() => {
    if (!active) return;
    let release = () => {};
    const arm = () => {
      release = pushBack(() => {
        if (handler.current) handler.current();
        else arm(); // can't leave this one: stay on it
      });
    };
    arm();
    return () => release();
  }, [active]);
}
