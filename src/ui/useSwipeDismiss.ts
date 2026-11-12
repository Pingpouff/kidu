import React, { useRef, useState } from 'react';
import { richMotion } from '../services/effects';

const THRESHOLD_PX = 80; // like Android: past this, the toast leaves
const FLING_PX_PER_MS = 0.6; // or a quick flick
const CLICK_SLOP_PX = 8; // below this, it's a tap, not a swipe

/**
 * Swipe a toast sideways to dismiss it, like an Android notification.
 * Spread `handlers` on the element and apply `style`. A real swipe cancels
 * the click that would follow (`onClickCapture`).
 */
export function useSwipeDismiss(onDismiss: () => void) {
  const start = useRef<{ x: number; y: number; t: number; id: number } | null>(null);
  const moved = useRef(false);
  const [dx, setDx] = useState(0);
  const [leaving, setLeaving] = useState<0 | 1 | -1>(0);
  const [dragging, setDragging] = useState(false);

  const finish = (direction: 1 | -1) => {
    if (!richMotion()) {
      onDismiss();
      return;
    }
    setLeaving(direction);
    window.setTimeout(onDismiss, 180);
  };

  const handlers = {
    onPointerDown: (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      start.current = { x: e.clientX, y: e.clientY, t: performance.now(), id: e.pointerId };
      moved.current = false;
    },
    onPointerMove: (e: React.PointerEvent) => {
      const s = start.current;
      if (!s || s.id !== e.pointerId) return;
      const x = e.clientX - s.x;
      if (!moved.current) {
        // Mostly vertical: let the page scroll
        if (Math.abs(e.clientY - s.y) > Math.abs(x) && Math.abs(e.clientY - s.y) > CLICK_SLOP_PX) {
          start.current = null;
          return;
        }
        if (Math.abs(x) < CLICK_SLOP_PX) return;
        moved.current = true;
        setDragging(true);
        (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
      }
      setDx(x);
    },
    onPointerUp: (e: React.PointerEvent) => {
      const s = start.current;
      start.current = null;
      setDragging(false);
      if (!s || !moved.current) return;
      const x = e.clientX - s.x;
      const speed = Math.abs(x) / Math.max(1, performance.now() - s.t);
      if (Math.abs(x) > THRESHOLD_PX || speed > FLING_PX_PER_MS) finish(x > 0 ? 1 : -1);
      else setDx(0);
    },
    onPointerCancel: () => {
      start.current = null;
      setDragging(false);
      setDx(0);
    },
    onClickCapture: (e: React.MouseEvent) => {
      if (moved.current) {
        e.preventDefault();
        e.stopPropagation();
        moved.current = false;
      }
    },
  };

  const offset = leaving ? leaving * window.innerWidth : dx;
  const style: React.CSSProperties = {
    transform: offset ? `translateX(${offset}px)` : undefined,
    opacity: offset ? Math.max(0, 1 - Math.abs(offset) / 300) : undefined,
    transition: dragging ? 'none' : 'transform 180ms ease-out, opacity 180ms ease-out',
    touchAction: 'pan-y',
  };

  return { handlers, style, dragging };
}
