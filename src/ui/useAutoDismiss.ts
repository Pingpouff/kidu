import React, { useEffect, useRef, useState } from 'react';

/**
 * Closes something after `ms`, but never while the user is touching,
 * hovering or focusing it (Material snackbar behaviour): the countdown starts
 * again from the full delay once they let go. `ms` null = no auto-close.
 * Spread `handlers` on the element.
 */
export function useAutoDismiss(ms: number | null, onDismiss: () => void, { fullScreen = false } = {}) {
  const [paused, setPaused] = useState(false);
  const holds = useRef(new Set<string>());
  const dismissRef = useRef(onDismiss);
  dismissRef.current = onDismiss;

  useEffect(() => {
    if (ms === null || paused) return;
    const timer = window.setTimeout(() => dismissRef.current(), ms);
    return () => window.clearTimeout(timer);
  }, [ms, paused]);

  const hold = (reason: string) => () => {
    holds.current.add(reason);
    setPaused(true);
  };
  const release = (reason: string) => () => {
    holds.current.delete(reason);
    if (holds.current.size === 0) setPaused(false);
  };

  const handlers = {
    // A full-screen view is always "hovered" and takes the focus when it opens: only a press pauses it
    onPointerEnter: (e: React.PointerEvent) => !fullScreen && e.pointerType === 'mouse' && hold('hover')(),
    onPointerLeave: release('hover'),
    onPointerDown: hold('press'),
    onPointerUp: release('press'),
    onPointerCancel: release('press'),
    onFocus: fullScreen ? undefined : hold('focus'),
    onBlur: fullScreen ? undefined : release('focus'),
  };

  return { paused, handlers };
}
