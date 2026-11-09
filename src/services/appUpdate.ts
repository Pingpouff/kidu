import { useCallback, useEffect, useRef, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { applyUpdate } from './swUpdate';

/** How often an open app asks the server for a new version. */
const CHECK_INTERVAL_MS = 60 * 60 * 1000;

export type UpdateCheckResult = 'checking' | 'up_to_date' | 'available' | 'unavailable';

export interface AppUpdate {
  /** A new version is downloaded and waits for `applyUpdate` */
  updateAvailable: boolean;
  /** Activates the new version and reloads the page */
  applyUpdate: () => void;
  /** `applyUpdate` was called: the page is about to reload */
  updating: boolean;
  /** Asks the server for a new version right now */
  checkNow: () => Promise<void>;
  /** Result of the last manual check (null before any) */
  lastCheck: UpdateCheckResult | null;
}

/**
 * Service worker registration with update prompt (registerType: 'prompt').
 * Checks for a new version every hour and whenever the app comes back to the
 * foreground; the page only reloads when `applyUpdate` is called.
 */
export function useAppUpdate(): AppUpdate {
  const registrationRef = useRef<ServiceWorkerRegistration | undefined>(undefined);
  const [lastCheck, setLastCheck] = useState<UpdateCheckResult | null>(null);
  const [updating, setUpdating] = useState(false);

  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    immediate: true,
    onRegisteredSW(_url, registration) {
      registrationRef.current = registration;
    },
  });

  const check = useCallback(async () => {
    const registration = registrationRef.current;
    if (!registration || !navigator.onLine) return false;
    try {
      await registration.update();
      return true;
    } catch {
      return false; // offline or server unreachable: try again later
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(check, CHECK_INTERVAL_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible') check();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [check]);

  const needRefreshRef = useRef(needRefresh);
  useEffect(() => {
    needRefreshRef.current = needRefresh;
  }, [needRefresh]);

  const checkNow = useCallback(async () => {
    setLastCheck('checking');
    const reached = await check();
    if (!reached) {
      setLastCheck('unavailable');
      return;
    }
    // A found update installs in the background, then flips `needRefresh`
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setLastCheck(needRefreshRef.current ? 'available' : 'up_to_date');
  }, [check]);

  return {
    updateAvailable: needRefresh,
    applyUpdate: () => {
      setUpdating(true);
      applyUpdate({
        registration: registrationRef.current,
        skipWaiting: () => {
          updateServiceWorker(true);
        },
        onControllerChange: (listener) => navigator.serviceWorker?.addEventListener('controllerchange', listener, { once: true }),
        reload: () => window.location.reload(),
        setTimeout: (fn, ms) => window.setTimeout(fn, ms),
      });
    },
    updating,
    checkNow,
    lastCheck,
  };
}

const LAST_SEEN_KEY = 'kidu.lastSeenVersion';

/** Version the "What's new" window was last computed for (null if never, or storage blocked). */
export function readLastSeenVersion(): string | null {
  try {
    return localStorage.getItem(LAST_SEEN_KEY);
  } catch {
    return null;
  }
}

export function saveLastSeenVersion(version: string): void {
  try {
    localStorage.setItem(LAST_SEEN_KEY, version);
  } catch {
    // Best effort: without storage, "What's new" just won't show
  }
}
