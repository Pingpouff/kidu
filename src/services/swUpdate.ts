/**
 * Applying a downloaded update, whatever state the service worker is in.
 * Kept apart from the `virtual:pwa-register` hook so it can be unit-tested.
 *
 * - A new worker is waiting (the usual case): ask it to take over and reload
 *   as soon as it controls the page. vite-plugin-pwa only reloads when the page
 *   was already controlled when it registered, so we listen ourselves too.
 * - No worker is waiting: the new version is already active. This happens when
 *   the page was loaded without a controller (first visit, hard reload): the new
 *   worker activated at once, but this page still runs the old code. Reload.
 * - Safety net: if nothing happened after FALLBACK_RELOAD_MS, reload anyway.
 */
export const FALLBACK_RELOAD_MS = 3000;

export interface UpdateEnvironment {
  registration: Pick<ServiceWorkerRegistration, 'waiting'> | undefined;
  /** Sends SKIP_WAITING to the waiting worker (vite-plugin-pwa's updateServiceWorker) */
  skipWaiting: () => void;
  onControllerChange: (listener: () => void) => void;
  reload: () => void;
  setTimeout: (fn: () => void, ms: number) => void;
}

export function applyUpdate(env: UpdateEnvironment): 'activating' | 'reloading' {
  if (!env.registration?.waiting) {
    env.reload();
    return 'reloading';
  }
  let reloaded = false;
  const reloadOnce = () => {
    if (reloaded) return;
    reloaded = true;
    env.reload();
  };
  env.onControllerChange(reloadOnce);
  env.skipWaiting();
  env.setTimeout(reloadOnce, FALLBACK_RELOAD_MS);
  return 'activating';
}
