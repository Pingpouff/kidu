import { useEffect, useState } from 'react';

/**
 * Two-tap confirmation: the first tap arms the action, the second (within
 * `timeoutMs`) runs it. Returns whether it is armed and the tap handler.
 */
export function useConfirmTap(action: () => void, timeoutMs = 3000): { armed: boolean; tap: () => void; reset: () => void } {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const timer = setTimeout(() => setArmed(false), timeoutMs);
    return () => clearTimeout(timer);
  }, [armed, timeoutMs]);
  return {
    armed,
    tap: () => {
      if (armed) {
        setArmed(false);
        action();
      } else {
        setArmed(true);
      }
    },
    reset: () => setArmed(false),
  };
}

